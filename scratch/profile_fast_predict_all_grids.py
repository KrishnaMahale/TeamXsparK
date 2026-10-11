import joblib
import time
import numpy as np
from pathlib import Path

models_dir = Path("backend/data/models")

for grid in ["default", "medium", "large"]:
    filename = f"power_flow_surrogate_{grid}.joblib"
    data = joblib.load(models_dir / filename)
    m = data["model"]
    estimators = m.estimators_
    n_est = len(estimators)
    
    # Pre-extract structures
    missing_bins = [est._bin_mapper.missing_values_bin_idx_ for est in estimators]
    baselines = [est._baseline_prediction for est in estimators]
    predictors_list = [est._predictors for est in estimators]
    bin_mappers = [est._bin_mapper for est in estimators]
    
    # 21 candidates in batch
    X = np.ones((21, 10), dtype=np.float64)
    
    # Standard MultiOutputRegressor.predict
    t0 = time.perf_counter()
    for _ in range(20):
        res_std = m.predict(X)
    t_std = (time.perf_counter() - t0) * 1000.0 / 20
    
    # Fast binned predict
    def fast_predict(X_mat):
        n_samples = X_mat.shape[0]
        preds = np.empty((n_samples, n_est), dtype=np.float64, order="C")
        for j in range(n_est):
            binned = bin_mappers[j].transform(X_mat)
            raw = np.zeros((n_samples, 1), dtype=np.float64, order="F") + baselines[j]
            miss_bin = missing_bins[j]
            for preds_i in predictors_list[j]:
                raw[:, 0] += preds_i[0].predict_binned(binned, missing_values_bin_idx=miss_bin, n_threads=1)
            preds[:, j] = raw[:, 0]
        return preds
        
    t0 = time.perf_counter()
    for _ in range(20):
        res_fast = fast_predict(X)
    t_fast = (time.perf_counter() - t0) * 1000.0 / 20
    
    print(f"=== {grid} ===")
    print(f"Standard predict: {t_std:.2f} ms")
    print(f"Fast predict:     {t_fast:.2f} ms")
    print(f"Speedup:          {t_std / t_fast:.2f}x")
    print(f"Match:            {np.allclose(res_std, res_fast)}")
