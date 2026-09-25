import numpy as np
import pandas as pd


class FeatureEngineer:
    @staticmethod
    def extract_time_features(df: pd.DataFrame, time_col: str = "time") -> pd.DataFrame:
        """
        Extracts temporal features from "HH:MM" or datetime timestamps.
        Includes hour, minute, cyclical sin/cos representations.
        """
        df_feat = df.copy()

        if time_col in df_feat.columns:
            if df_feat[time_col].dtype == object and ":" in str(df_feat[time_col].iloc[0]):
                parts = df_feat[time_col].str.split(":", expand=True)
                df_feat["hour"] = parts[0].astype(int)
                df_feat["minute"] = parts[1].astype(int)
            else:
                dt_series = pd.to_datetime(df_feat[time_col])
                df_feat["hour"] = dt_series.dt.hour
                df_feat["minute"] = dt_series.dt.minute
        else:
            df_feat["hour"] = 12
            df_feat["minute"] = 0

        # Cyclical encoding
        df_feat["hour_sin"] = np.sin(2 * np.pi * df_feat["hour"] / 24.0)
        df_feat["hour_cos"] = np.cos(2 * np.pi * df_feat["hour"] / 24.0)

        return df_feat
