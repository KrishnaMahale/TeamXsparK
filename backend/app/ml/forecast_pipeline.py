"""Step 4D — Real ML Forecast Pipeline.

Orchestrates:
1. Grid resolution and installed asset capacities
2. Deterministic, leakage-safe historical context initialization
3. 96-step (24h x 15m) recursive meteorological and load inference
4. Physical PV conversion (temperature-derated, inverter-rated)
5. Physical grid load scaling
6. Deterministic in-memory response caching
"""

import os
import re
import json
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.core.logging import logger
from app.schemas.network import GridNetwork
from app.schemas.forecast import ForecastResponse, ForecastMetrics, ForecastDataPoint
from app.ml.model_registry import get_model_registry
from app.ml.preprocessing import calculate_solar_elevation
from app.ml.feature_engineering import haurwitz_clearsky_proxy

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FEATURES_DIR = BASE_DIR / "data" / "features"


class ForecastPipeline:
    """Production ML forecast generator for 15-minute 24-hour day-ahead predictions."""

    def __init__(self):
        self.registry = get_model_registry()
        self._solar_df: Optional[pd.DataFrame] = None
        self._temp_df: Optional[pd.DataFrame] = None
        self._load_df: Optional[pd.DataFrame] = None
        self._cache: Dict[Tuple[str, str, int, str], ForecastResponse] = {}

    def _get_feature_data(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Lazy load canonical feature datasets for seed history."""
        if self._solar_df is None:
            s_path = FEATURES_DIR / "solar_forecasting_features.csv"
            t_path = FEATURES_DIR / "temperature_forecasting_features.csv"
            l_path = FEATURES_DIR / "load_forecasting_features.csv"

            if not s_path.exists() or not t_path.exists() or not l_path.exists():
                raise FileNotFoundError(
                    f"Feature datasets missing in {FEATURES_DIR}. Step 4B datasets are required."
                )

            logger.info("[ForecastPipeline] Loading feature datasets for historical lag seeds...")
            self._solar_df = pd.read_csv(s_path)
            self._temp_df = pd.read_csv(t_path)
            self._load_df = pd.read_csv(l_path)

        return self._solar_df, self._temp_df, self._load_df

    def validate_request(self, grid: GridNetwork, target_date_str: str, horizon_hours: int) -> datetime.date:
        """Validates horizon, date format, and grid assets."""
        if horizon_hours != 24:
            raise ValueError(
                f"Unsupported forecast horizon: {horizon_hours} hours. Currently exactly 24 hours (96 x 15-minute intervals) is supported."
            )

        if not target_date_str or not re.match(r"^\d{4}-\d{2}-\d{2}$", target_date_str):
            raise ValueError(
                f"Invalid target_date format '{target_date_str}'. Must be YYYY-MM-DD."
            )

        try:
            target_date = datetime.date.fromisoformat(target_date_str)
        except ValueError as e:
            raise ValueError(f"Invalid calendar date '{target_date_str}': {e}") from e

        # Telemetry dataset began in May 2024
        if target_date < datetime.date(2024, 5, 12):
            raise ValueError(
                f"Target date {target_date_str} precedes available CWPRS telemetry (May 2024)."
            )

        return target_date

    def generate_forecast(
        self,
        grid: GridNetwork,
        target_date_str: Optional[str] = None,
        horizon_hours: int = 24,
    ) -> ForecastResponse:
        """Generates a complete, deterministic, grid-aware 24-hour forecast."""
        # 1. Resolve target date
        if not target_date_str:
            # Default: next day in local IST or latest benchmark date
            now_ist = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
            target_date = (now_ist + datetime.timedelta(days=1)).date()
            target_date_str = target_date.isoformat()
        else:
            target_date = self.validate_request(grid, target_date_str, horizon_hours)

        # 2. Check in-memory cache
        meta = self.registry.get_metadata()
        model_version = meta.get("solar_ghi_model", {}).get("training_timestamp", "v1")
        cache_key = (grid.id, target_date_str, horizon_hours, model_version)
        if cache_key in self._cache:
            logger.info(f"[ForecastPipeline] Returning cached forecast for grid {grid.id} on {target_date_str}")
            return self._cache[cache_key]

        logger.info(
            f"[ForecastPipeline] Generating 24h ML forecast for grid='{grid.name}' (id={grid.id}) "
            f"target_date={target_date_str} horizon={horizon_hours}h"
        )

        # 3. Resolve Grid Asset Capacities
        total_solar_capacity_kw = sum(u.capacityKw for u in grid.solarUnits if u.capacityKw)
        total_load_nominal_kw = sum(l.powerKw for l in grid.loads if l.powerKw)

        # 4. Extract Historical Context Prior to target_date 00:00 IST
        sf, tf, lf = self._get_feature_data()
        t_start_str = f"{target_date_str} 00:00:00+0530"

        # Query preceding 24h telemetry (96 timesteps)
        hist_sf = sf[sf["timestamp"] < t_start_str].tail(96)
        hist_tf = tf[tf["timestamp"] < t_start_str].tail(96)

        if len(hist_sf) < 96:
            # If date is within the first 24h of monitoring, take earliest available 96 rows
            hist_sf = sf.head(96)
            hist_tf = tf.head(96)

        # Extract buffers for initial autoregressive lags
        ghi_buffer = hist_sf["target_ghi_wm2"].dropna().tolist()[-8:]
        if len(ghi_buffer) < 8:
            ghi_buffer = [0.0] * 8

        temp_buffer = hist_tf["target_temperature_c"].dropna().tolist()[-4:]
        if len(temp_buffer) < 4:
            temp_buffer = [25.0] * 4

        # Prior 24h diurnal lags (the same slots 24h before forecast origin)
        prior_24h_ghi = hist_sf["target_ghi_wm2"].fillna(0.0).values
        prior_24h_temp = hist_tf["target_temperature_c"].ffill().bfill().values

        if len(prior_24h_ghi) < 96:
            prior_24h_ghi = np.pad(prior_24h_ghi, (0, 96 - len(prior_24h_ghi)), "edge")
        if len(prior_24h_temp) < 96:
            prior_24h_temp = np.pad(prior_24h_temp, (0, 96 - len(prior_24h_temp)), "edge")

        # 5. Build 96 Forecast Timestamps & Solar Geometry
        tz_offset = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        origin_dt = datetime.datetime(
            target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=tz_offset
        )
        dts = [origin_dt + datetime.timedelta(minutes=15 * i) for i in range(96)]
        dt_series = pd.Series(dts)
        elevations = calculate_solar_elevation(dt_series)

        # 6. Load Models
        solar_model = self.registry.get_solar_model()
        temp_model = self.registry.get_temperature_model()
        load_model = self.registry.get_load_model()

        solar_feats = meta.get("solar_ghi_model", {}).get("feature_names", [])
        temp_feats = meta.get("temperature_model", {}).get("feature_names", [])
        load_feats = meta.get("load_profile_model", {}).get("feature_names", [])

        # 7. Recursive 96-step Meteorological Rollout (Temperature + Solar GHI)
        ghi_predictions = []
        temp_predictions = []

        for i, dt in enumerate(dts):
            elev = float(elevations[i])
            slot = dt.hour * 4 + dt.minute // 15
            min_of_day = dt.hour * 60 + dt.minute
            doy = dt.timetuple().tm_yday
            month = dt.month
            dow = dt.weekday()

            # (A) Predict Temperature at t_i
            t_feat = {
                "minute_of_day": min_of_day,
                "slot_15m": slot,
                "hour": dt.hour,
                "day_of_week": dow,
                "day_of_year": doy,
                "month": month,
                "day_of_year_sin": np.round(np.sin(2 * np.pi * doy / 365.25), 4),
                "day_of_year_cos": np.round(np.cos(2 * np.pi * doy / 365.25), 4),
                "slot_15m_sin": np.round(np.sin(2 * np.pi * slot / 96.0), 4),
                "slot_15m_cos": np.round(np.cos(2 * np.pi * slot / 96.0), 4),
                "solar_elevation_deg": elev,
                "temperature_lag_15m": temp_buffer[-1],
                "temperature_lag_24h": prior_24h_temp[i],
                "temperature_roll_mean_1h": np.mean(temp_buffer[-4:]),
                "temperature_roll_std_1h": np.std(temp_buffer[-4:]),
            }
            t_df = pd.DataFrame([t_feat])[temp_feats]
            pred_t = float(temp_model.predict(t_df)[0])
            temp_predictions.append(pred_t)
            temp_buffer.append(pred_t)

            # (B) Predict Solar GHI at t_i
            cs = haurwitz_clearsky_proxy(np.array([elev]))[0]
            s_feat = {
                "minute_of_day": min_of_day,
                "slot_15m": slot,
                "hour": dt.hour,
                "day_of_week": dow,
                "day_of_year": doy,
                "month": month,
                "day_of_year_sin": np.round(np.sin(2 * np.pi * doy / 365.25), 4),
                "day_of_year_cos": np.round(np.cos(2 * np.pi * doy / 365.25), 4),
                "slot_15m_sin": np.round(np.sin(2 * np.pi * slot / 96.0), 4),
                "slot_15m_cos": np.round(np.cos(2 * np.pi * slot / 96.0), 4),
                "solar_elevation_deg": elev,
                "solar_elevation_sin": np.round(np.sin(np.radians(elev)), 4),
                "solar_elevation_cos": np.round(np.cos(np.radians(elev)), 4),
                "is_night": bool(elev <= -5.0),
                "clearsky_proxy_wm2": cs,
                "ghi_lag_15m": ghi_buffer[-1],
                "ghi_lag_30m": ghi_buffer[-2] if len(ghi_buffer) >= 2 else ghi_buffer[-1],
                "ghi_lag_45m": ghi_buffer[-3] if len(ghi_buffer) >= 3 else ghi_buffer[-1],
                "ghi_lag_24h": prior_24h_ghi[i],
                "ghi_roll_mean_2h": np.mean(ghi_buffer[-8:]),
                "ghi_roll_std_2h": np.std(ghi_buffer[-8:]),
                "temperature_c": pred_t,
                "temperature_lag_24h": prior_24h_temp[i],
            }
            s_df = pd.DataFrame([s_feat])[solar_feats]
            pred_ghi = float(solar_model.predict(s_df)[0])
            pred_ghi = max(0.0, pred_ghi)

            # Enforce physical nighttime solar geometry
            if elev <= 0.0:
                pred_ghi = 0.0

            ghi_predictions.append(pred_ghi)
            ghi_buffer.append(pred_ghi)

        # 8. Physical PV Conversion (Step 2 & Section 9 Equations)
        solar_generation_kw = []
        for i in range(96):
            ghi = ghi_predictions[i]
            t_amb = temp_predictions[i]

            if total_solar_capacity_kw <= 0.0 or ghi <= 0.0:
                solar_generation_kw.append(0.0)
            else:
                # Cell temperature: T_cell = T_amb + GHI * ((NOCT - 20) / 800) with NOCT=45
                t_cell = t_amb + ghi * (25.0 / 800.0)
                # Temperature derating: 1 - gamma * (T_cell - 25) with gamma=0.004
                derate = max(0.0, 1.0 - 0.004 * (t_cell - 25.0))
                # AC System efficiency: 0.864, G_STC: 1000 W/m²
                p_pv = total_solar_capacity_kw * (ghi / 1000.0) * derate * 0.864
                # Inverter clipping at rated capacity
                p_solar = max(0.0, min(total_solar_capacity_kw, p_pv))
                solar_generation_kw.append(round(p_solar, 2))

        # 9. Empirical Residential Load Profile Generation (96-step rollout across homes)
        val_lf = lf[lf["split_set"] == "validation"]
        home_buffers = {}
        for hid in range(1, 11):
            h_df = val_lf[val_lf["home_id"] == hid].sort_values("timestamp")
            home_buffers[hid] = h_df["target_gross_load_kw"].dropna().tolist()[-4:]

        dow = dts[0].weekday()
        is_wknd = int(dow in [5, 6])

        raw_load_profile = []
        for i, dt in enumerate(dts):
            slot = dt.hour * 4 + dt.minute // 15
            min_of_day = dt.hour * 60 + dt.minute
            s_sin = np.round(np.sin(2 * np.pi * slot / 96.0), 4)
            s_cos = np.round(np.cos(2 * np.pi * slot / 96.0), 4)

            step_rows = []
            for hid in range(1, 11):
                buf = home_buffers[hid]
                step_rows.append({
                    "home_id": hid,
                    "minute_of_day": min_of_day,
                    "slot_15m": slot,
                    "hour": dt.hour,
                    "day_of_week": dow,
                    "is_weekend": is_wknd,
                    "slot_15m_sin": s_sin,
                    "slot_15m_cos": s_cos,
                    "load_lag_15m": buf[-1],
                    "load_lag_30m": buf[-2] if len(buf) >= 2 else buf[-1],
                    "load_roll_mean_1h": np.mean(buf[-4:]),
                    "load_roll_std_1h": np.std(buf[-4:]),
                })
            df_load_step = pd.DataFrame(step_rows)[load_feats]
            home_preds = np.maximum(0.0, load_model.predict(df_load_step))
            for idx, hid in enumerate(range(1, 11)):
                home_buffers[hid].append(home_preds[idx])
            raw_load_profile.append(float(np.mean(home_preds)))

        # 10. Scale Load Profile to Grid's Actual Nominal Load
        max_profile_load = max(raw_load_profile) if raw_load_profile else 1.0
        if max_profile_load <= 0.0:
            max_profile_load = 1.0

        grid_load_demand_kw = []
        for raw_val in raw_load_profile:
            if total_load_nominal_kw <= 0.0:
                grid_load_demand_kw.append(0.0)
            else:
                normalized_shape = raw_val / max_profile_load
                p_load = total_load_nominal_kw * normalized_shape
                grid_load_demand_kw.append(round(max(0.0, p_load), 2))

        # 11. Build 96 ForecastDataPoint List
        data_points: List[ForecastDataPoint] = []
        solar_rmse_kw = total_solar_capacity_kw * 0.08  # Approx 8% rated capacity confidence bound

        for i in range(96):
            dt = dts[i]
            time_str = dt.strftime("%H:%M")
            iso_str = dt.isoformat()

            p_sol = solar_generation_kw[i]
            p_lod = grid_load_demand_kw[i]
            net_pwr = round(p_sol - p_lod, 2)

            conf_low = max(0.0, round(p_sol - 1.96 * solar_rmse_kw, 2)) if p_sol > 0 else 0.0
            conf_high = min(total_solar_capacity_kw, round(p_sol + 1.96 * solar_rmse_kw, 2)) if p_sol > 0 else 0.0

            data_points.append(
                ForecastDataPoint(
                    time=time_str,
                    timestamp=iso_str,
                    solarGenerationKw=p_sol,
                    loadDemandKw=p_lod,
                    predictedSolarKw=p_sol,
                    predictedLoadKw=p_lod,
                    netPowerKw=net_pwr,
                    confidenceLowerKw=conf_low,
                    confidenceUpperKw=conf_high,
                )
            )

        # 12. Build ForecastMetrics
        current_solar = data_points[0].predictedSolarKw
        current_load = data_points[0].predictedLoadKw
        peak_solar = max(pt.predictedSolarKw for pt in data_points)
        peak_load = max(pt.predictedLoadKw for pt in data_points)

        metrics = ForecastMetrics(
            currentSolarKw=current_solar,
            currentLoadKw=current_load,
            netPowerKw=round(current_solar - current_load, 2),
            peakSolarKw=round(peak_solar, 2),
            peakLoadKw=round(peak_load, 2),
            solarAccuracyPercent=None,
            loadAccuracyPercent=None,
            modelType="Solar: HistGradientBoosting | Temp: Ridge | Load: HistGradientBoosting",
            forecastHorizonHours=24,
            isMockDemo=False,
            gridId=grid.id,
            targetDate=target_date_str,
            timezone="Asia/Kolkata",
            resolutionMinutes=15,
        )

        response = ForecastResponse(
            timestamp=origin_dt.isoformat(),
            horizonHours=24,
            metrics=metrics,
            dataPoints=data_points,
        )

        # Store in cache
        self._cache[cache_key] = response
        logger.info(
            f"[ForecastPipeline] Generated 96 forecast points successfully for grid={grid.id} "
            f"(Peak Solar: {peak_solar} kW, Peak Load: {peak_load} kW)"
        )
        return response


_PIPELINE = None


def get_forecast_pipeline() -> ForecastPipeline:
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = ForecastPipeline()
    return _PIPELINE
