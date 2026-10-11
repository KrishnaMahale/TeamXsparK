import joblib
from pathlib import Path
import time
import numpy as np

models_dir = Path("backend/data/models")
for name in ["power_flow_surrogate_default.joblib", "power_flow_surrogate_medium.joblib", "power_flow_surrogate_large.joblib"]:
    p = models_dir / name
    if p.exists():
        data = joblib.load(p)
        model = data.get("model")
        print(f"=== {name} ===")
        print(f"Type: {type(model)}")
        print(f"Target count: {len(data.get('target_names', []))}")
        print(f"Targets: {data.get('target_names')}")
        if hasattr(model, "n_estimators"):
            print(f"Estimators: {model.n_estimators}")
        
        # Test predict timing
        X = np.ones((10, 10))
        t0 = time.perf_counter()
        for _ in range(100):
            preds = model.predict(X)
        dt_ms = (time.perf_counter() - t0) * 10
        print(f"10-row predict time: {dt_ms:.3f} ms per call")
    else:
        print(f"{name}: NOT FOUND")
