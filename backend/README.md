# TeamXsparK Backend — Renewable Distribution Grid Digital Twin

A high-performance, control-room-grade FastAPI backend for the **Renewable Distribution Grid Digital Twin**, engineered to simulate, predict, and optimize medium-voltage electrical distribution feeders operating under high rooftop solar and distributed energy resource (DER) penetration.

---

## 1. Architecture Overview

```text
FastAPI Route Handlers (/api)
         ↓
Service Layer (Simulation, Power Flow, Constraints, Actions, Forecast, Reports)
         ↓
Engineering Engines (PowerFlowEngine, ConstraintChecker, ActionEngine, BatteryEngine)
         ↓
ML Layer (RandomForest Solar & Load Forecasters)
         ↓
Database Repository Layer (Supabase PostgreSQL Client with In-Memory Fallback)
```

---

## 2. Prerequisites & Environment

- **Python:** 3.11+ (Tested and verified on Python 3.13.6)
- **Node.js:** v18+ (for frontend)
- **Supabase Account (Optional for cloud storage; in-memory repository is enabled by default for zero-setup local demo and testing)**

---

## 3. Quick Start (Windows / Linux / macOS)

### Step 1: Navigate to backend & Create Virtual Environment
```bash
cd backend

# Create virtualenv
python -m venv .venv

# Activate on Windows:
.venv\Scripts\activate

# Activate on Linux / macOS:
source .venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Train Baseline Models & Seed Database
```bash
# 1. Train Random Forest forecasting models (saved to ./data/models/)
python scripts/train_models.py

# 2. Seed 5 demo benchmarks & default network topology
python scripts/seed_database.py

# 3. Generate sample CSV profile for frontend simulation upload
python scripts/generate_demo_data.py
```

### Step 4: Run FastAPI Server
```bash
uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000/api`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- ReDoc Docs: `http://localhost:8000/redoc`

---

## 4. Supabase Setup & Migrations

If connecting to a live Supabase PostgreSQL project:
1. Open your Supabase SQL Editor.
2. Run the migration script in `app/db/migrations/001_initial_schema.sql`.
3. In `backend/.env`, set:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. Re-run `python scripts/seed_database.py` to populate your Supabase tables.

---

## 5. API Endpoints

### Health
- `GET /api/health`: Health status & service version

### Scenarios
- `GET /api/scenarios`: List all benchmark scenarios
- `POST /api/scenarios`: Create new custom scenario
- `GET /api/scenarios/{id}`: Get specific scenario
- `PUT /api/scenarios/{id}`: Update scenario
- `DELETE /api/scenarios/{id}`: Delete scenario
- `POST /api/scenarios/{id}/run`: Run scenario benchmark

### Simulations
- `POST /api/simulations/run`: Run multi-step full time-series simulation from `SimulationInput`
- `POST /api/simulations`: Prepare new simulation run
- `POST /api/simulations/{id}/run`: Run simulation by ID
- `GET /api/simulations/{id}`: Fetch simulation state
- `GET /api/simulations/{id}/results`: Fetch time-step power-flow results
- `POST /api/simulation/power-flow`: Single timestamp power flow (`{ time, scenarioId }`)
- `POST /api/simulation/corrective-actions`: Formulate & evaluate actions
- `POST /api/simulation/actions/{action_id}/execute`: Execute corrective action (`ACT-01`, `ACT-02`, etc.)

### Forecasting
- `GET /api/forecast/timeseries?horizon=24`: 24-hour solar & load predictions with confidence bounds
- `GET /api/forecast/metrics`: Random Forest accuracy, peak projections, and model type

### Network
- `GET /api/grid/network`: Full 4-bus network topology, transformers, feeders, and DER assets
- `GET /api/grid/buses/{id}`: Single bus telemetry & limits
- `GET /api/grid/feeders/{id}`: Single feeder ampacity & switch status

### Reports
- `POST /api/reports/generate`: Compute quantitative operational summary
- `GET /api/reports/{simulation_id}`: Export full report payload

---

## 6. Engineering Pipeline & Physics

1. **Power Flow Engine:** Solves AC / DistFlow distribution calculations across radial and tie-line networks with line impedance ($R, X$). High solar export at Bus 3 elevates bus voltage ($\Delta V \approx \frac{RP + XQ}{V}$) above $1.05\text{ pu}$ (e.g. $1.074\text{ pu}$) and pushes Feeder F-02 loading over $100\%$ ($108\%$).
2. **Constraint Checking:** Audits statutory limits ($V_{min}=0.95\text{ pu}$, $V_{max}=1.05\text{ pu}$, feeder ampacity $100\%$) and generates critical or warning `GridViolation`s.
3. **Corrective Action & Feasibility Engine:**
   - **Battery Discharge (ACT-01):** Feasible if SOC > 20% safe floor.
   - **Feeder Reconfiguration (ACT-02):** Energizes tie-line F-03, relieving F-02 loading from $108\% \rightarrow 92\%$ and reducing voltage to $1.038\text{ pu}$ safely.
   - **Solar Curtailment (ACT-03):** Curtains rooftop generation by 30 kW.
   - **Max Battery Discharge (ACT-04):** Strictly evaluated against SOC depth-of-discharge constraints; returns **NOT FEASIBLE** when battery reserve is exhausted ($\le 20\%$).

---

## 7. Automated Testing

Run the pytest suite:
```bash
pytest
```
Covers:
- `test_health.py`
- `test_validation.py`
- `test_forecasting.py`
- `test_power_flow.py`
- `test_constraints.py`
- `test_battery.py`
- `test_actions.py`
- `test_simulation.py`

Run live integration test:
```bash
python scripts/test_live_api.py
```
