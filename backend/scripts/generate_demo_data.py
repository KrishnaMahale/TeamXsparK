import os
import sys
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ml.preprocessing import generate_synthetic_training_data
from app.core.logging import setup_logging, logger


def generate_demo_csv():
    setup_logging()
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "sample"))
    os.makedirs(output_dir, exist_ok=True)

    df = generate_synthetic_training_data(days=1, installed_solar_capacity_kw=250.0)
    # Output columns matching frontend CSV uploader: timestamp,solar_kw,load_kw
    df_export = pd.DataFrame({
        "timestamp": df["time"],
        "solar_kw": df["solar_kw"],
        "load_kw": df["load_kw"],
    })

    csv_path = os.path.join(output_dir, "sample_solar_load_24h.csv")
    df_export.to_csv(csv_path, index=False)
    logger.info(f"Demo CSV successfully generated at: {csv_path}")


if __name__ == "__main__":
    generate_demo_csv()
