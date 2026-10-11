import joblib
import time
import numpy as np

d = joblib.load("backend/data/models/power_flow_surrogate_default.joblib")
m = d["model"]
estimators = m.estimators_
n_est = len(estimators)
X = np.ones((20, 10), dtype=np.float64)

# Method 1: Standard MultiOutputRegressor.predict
t0 = time.perf_counter()
for _ in range(50):
    res1 = m.predict(X)
t1 = (time.perf_counter() - t0) * 1000.0 / 50

# Method 2: Fast binned execution
# Each estimator has its own bin_mapper and predictors
binned_Xs = [est._bin_mapper.transform(X) for est in estimators]
missing_bins = [est._bin_mapper.missing_values_bin_idx_ for est in estimators]
baselines = [est._baseline_prediction for est in estimators]
predictors_list = [est._predictors for est in estimators]

def fast_predict(X_mat):
    n_samples = X_mat.shape[0]
    preds = np.empty((n_samples, n_est), dtype=np.float64, order="C")
    for j in range(n_est):
        binned = estimators[j]._bin_mapper.transform(X_mat)
        raw = np.zeros((n_samples, 1), dtype=np.float64, order="F") + baselines[j]
        miss_bin = missing_bins[j]
        for preds_i in predictors_list[j]:
            raw[:, 0] += preds_i[0].predict_binned(binned, missing_values_bin_idx=miss_bin, n_threads=1)
        preds[:, j] = raw[:, 0]
    return preds

t0 = time.perf_counter()
for _ in range(50):
    res2 = fast_predict(X)
t2 = (time.perf_counter() - t0) * 1000.0 / 50

print(f"Standard m.predict: {t1:.3f} ms")
print(f"Fast binned predict: {t2:.3f} ms")
print("Match:", np.allclose(res1, res2))
print("Max diff:", np.max(np.abs(res1 - res2)))
