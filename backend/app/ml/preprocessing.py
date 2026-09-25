import math
import numpy as np
import pandas as pd
from typing import Tuple


def generate_synthetic_training_data(days: int = 14, installed_solar_capacity_kw: float = 250.0) -> pd.DataFrame:
    """
    Generates realistic historical training data for solar and load.
    Note: Clearly marked as DEMO / SYNTHETIC DATA for ML baseline training.
    """
    records = []
    np.random.seed(42)

    for day in range(days):
        for hour in range(24):
            for minute in [0, 15, 30, 45]:
                time_str = f"{hour:02d}:{minute:02d}"
                t_float = hour + minute / 60.0

                # Solar bell curve between 06:00 and 19:00
                if 6.0 <= t_float <= 19.0:
                    sun_factor = math.sin(((t_float - 6.0) / 13.0) * math.pi)
                    noise = np.random.normal(0, 0.05)
                    solar_kw = max(0.0, installed_solar_capacity_kw * (sun_factor + noise))
                else:
                    solar_kw = 0.0

                # Dual-peak load profile (morning peak 08:30-10:30, evening peak 18:30-21:30)
                base_load = 50.0
                morning_peak = 60.0 * math.exp(-((t_float - 9.5) ** 2) / 4.0)
                evening_peak = 90.0 * math.exp(-((t_float - 19.5) ** 2) / 6.0)
                load_noise = np.random.normal(0, 5.0)
                load_kw = max(20.0, base_load + morning_peak + evening_peak + load_noise)

                records.append({
                    "day": day,
                    "time": time_str,
                    "hour": hour,
                    "minute": minute,
                    "solar_kw": round(solar_kw, 2),
                    "load_kw": round(load_kw, 2),
                    "is_synthetic": True,
                })

    return pd.DataFrame(records)
