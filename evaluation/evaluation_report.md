# Genuine Measured Accuracy Report — Production ML Forecasting Models

Generated: 2026-10-10T06:03:15.358452+00:00  
Repository: Renewable Distribution Grid Digital Twin (`TeamXsparK`)  

---

## 1. Executive Summary Table

| Model | Evaluation Horizon | MAE | RMSE | R² | WAPE (%) | sMAPE (%) | Bias | Best Baseline MAE | MAE Impv (%) | Samples (N) | Evaluation Data Nature |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Solar GHI** (`solar_ghi_model.joblib`) | **1-Step Test** (Untouched) | **36.1296 W/m²** | 82.258 W/m² | 0.92 | 19.2662% | 21.0938% | 1.191 W/m² | 34.7435 W/m² (1-step pers.) | **+3.95%** | 2535 | Real CWPRS Telemetry |
| Solar GHI | **1-Step Daylight** | 70.9151 W/m² | 115.8136 W/m² | 0.8656 | 19.103% | 25.5656% | 3.1129 W/m² | — | — | 1278 | Real CWPRS Telemetry |
| Solar GHI | **24h Recursive Day-Ahead** | **88.0229 W/m²** | 163.0772 W/m² | 0.6857 | 46.9384% | 33.866% | 15.7192 W/m² | 108.4521 W/m² (Previous_Day_24h) | **+18.84%** | 2535 | Real CWPRS Telemetry |
| Solar GHI | **24h Daylight-Only** | **173.849 W/m²** | 229.6575 W/m² | 0.4714 | 46.8311% | 50.9001% | 31.9307 W/m² | 214.7934 W/m² (Previous_Day_24h) | **+19.06%** | 1278 | Real CWPRS Telemetry |
| **Temperature** (`temperature_model.joblib`) | **1-Step Test** (Untouched) | **1.7676 °C** | 2.6291 °C | 0.5092 | 6.6127% | 6.2977% | 0.0529 °C | 0.2757 °C (1-step pers.) | **-537.36%** | 2444 | Real CWPRS Telemetry |
| Temperature | **24h Recursive Day-Ahead** | **1.6135 °C** | 2.3783 °C | 0.5984 | 6.0363% | 5.8201% | 1.8919 °C (Previous_Day_24h) | **+14.72%** | 2444 | Real CWPRS Telemetry |
| **Load Profile** (`load_profile_model.joblib`) | **1-Step Test** (Untouched) | **0.805 kW** | 1.0976 kW | 0.6158 | 30.4583% | 37.6506% | 0.0526 kW | 1.0189 kW (1-step pers.) | **+20.99%** | 960 | Real Pecan Street Submetering |
| Load Profile | **24h Recursive Day-Ahead** | **1.1329 kW** | 1.4288 kW | 0.349 | 42.8621% | 50.1118% | 0.0974 kW | 1.3025 kW (Previous_Day_24h) | **+13.02%** | 960 | Real Pecan Street Submetering |

---

## 2. Recursive 24-Hour Day-Ahead Breakdown by Sub-Horizon

### Solar GHI Horizon Performance
- **0–6 Hours (Steps 1–24)**: MAE = **0.4309 W/m²**, Best Baseline (Previous_Day_24h) = 0.1728 W/m², Improvement = **-149.36%**
- **6–12 Hours (Steps 25–48)**: MAE = **149.9265 W/m²**, Best Baseline (ClearSky_Proxy) = 193.9691 W/m², Improvement = **+22.71%**
- **12–18 Hours (Steps 49–72)**: MAE = **220.7952 W/m²**, Best Baseline (Previous_Day_24h) = 236.819 W/m², Improvement = **+6.77%**
- **18–24 Hours (Steps 73–96)**: MAE = **2.4744 W/m²**, Best Baseline (Previous_Day_24h) = 3.188 W/m², Improvement = **+22.38%**

### Temperature Horizon Performance
- **0–6 Hours (Steps 1–24)**: MAE = **0.7505 °C**, Best Baseline (Persistence_Origin) = 0.7868 °C, Improvement = **+4.61%**
- **6–12 Hours (Steps 25–48)**: MAE = **1.437 °C**, Best Baseline (Previous_Day_24h) = 1.9909 °C, Improvement = **+27.82%**
- **12–18 Hours (Steps 49–72)**: MAE = **3.0801 °C**, Best Baseline (Previous_Day_24h) = 2.7598 °C, Improvement = **-11.61%**
- **18–24 Hours (Steps 73–96)**: MAE = **1.2257 °C**, Best Baseline (Previous_Day_24h) = 1.3561 °C, Improvement = **+9.62%**

### Electrical Load Horizon Performance
- **0–6 Hours (Steps 1–24)**: MAE = **1.0095 kW**, Best Baseline (Diurnal_Slot_Profile) = 1.2042 kW, Improvement = **+16.17%**
- **6–12 Hours (Steps 25–48)**: MAE = **1.2354 kW**, Best Baseline (Previous_Day_24h) = 1.3073 kW, Improvement = **+5.50%**
- **12–18 Hours (Steps 49–72)**: MAE = **1.3235 kW**, Best Baseline (Home_Mean) = 1.3982 kW, Improvement = **+5.34%**
- **18–24 Hours (Steps 73–96)**: MAE = **0.963 kW**, Best Baseline (Previous_Day_24h) = 1.1046 kW, Improvement = **+12.82%**

---

## 3. Defensible Percentage Score & Presentation Guidance

### Why Regression Has No Single "Accuracy Percentage"
1. **Zero-Inflation Blowup**: For solar GHI, nighttime values are strictly zero and twilight values are near zero (< 5 W/m²). Standard percentage error ($|y - \hat{y}| / y$) divides by zero and explodes towards infinity. Claiming "Accuracy = 100 - MAPE" is mathematically invalid.
2. **Explained Variance is Not Accuracy**: $R^2$ represents the fraction of target variance explained by the model relative to a mean baseline ($R^2 \in (-\infty, 1.0]$). $R^2 	imes 100$ is **never** a percentage accuracy score.
3. **Mathematically Defensible Formulations**:
   - **Weighted Absolute Percentage Error (WAPE)**: $\text{WAPE} = 100 \times \frac{\sum |y - \hat{y}|}{\sum |y|}$. This is mathematically robust to zero entries.
     - Solar 1-step WAPE: **19.2662%** (or **80.73%** accuracy-equivalent)
     - Temperature 1-step WAPE: **6.6127%** (or **93.39%** accuracy-equivalent)
     - Load 1-step WAPE: **30.4583%** (or **69.54%** accuracy-equivalent)
   - **Normalized MAE (nMAE by Range)**: $\text{nMAE} = \frac{\text{MAE}}{\max(y) - \min(y)}$.
     - Solar range: 1252.67 W/m² $\to$ 1-step nMAE = **2.88%**
     - Temperature range: 34.80 °C $\to$ 1-step nMAE = **5.08%**
     - Load range: 11.45 kW $\to$ 1-step nMAE = **7.03%**
