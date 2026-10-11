import joblib
from pathlib import Path
import numpy as np

p = Path("backend/data/models/power_flow_surrogate_default.joblib")
d = joblib.load(p)
m = d["model"]
est = m.estimators_[0]

print("est attributes:")
for attr in dir(est):
    if not attr.startswith("__"):
        val = getattr(est, attr)
        if not callable(val):
            print(f"  {attr}: {type(val)}")

print("n_iter_:", getattr(est, "n_iter_", None))
print("_predictors:", len(getattr(est, "_predictors", [])))
pred0 = est._predictors[0][0]
print("predictor 0 type:", type(pred0))
print("predictor 0 dir:", [a for a in dir(pred0) if not a.startswith("__")])
