# Renewable Distribution Grid Digital Twin

A high-performance, control-room-grade frontend for a **Renewable Distribution Grid Digital Twin**, engineered to monitor, predict, and optimize medium-voltage electrical distribution feeders operating under high rooftop solar and distributed energy resource (DER) penetration.

---

## 1. Project Overview

As rooftop solar photovoltaic (PV) penetration scales up, distribution feeders face severe technical constraints:
- **Voltage Rise & Surges:** Reverse power flows from distributed generation elevate nodal voltages above statutory limits (e.g., > 1.05 pu per IEEE 1547 / IEC 61727).
- **Thermal Overloading:** Reverse current spikes push underground and overhead feeder cables past 100% ampacity limits.
- **Infeasible Dispatch Scenarios:** Corrective mechanisms (such as battery energy storage systems) may fail if state-of-charge (SOC) limits or technical reserves are breached.

This digital twin provides an industrial-grade interface that:
1. **Predicts** near-term rooftop solar generation and nodal load demand using ML forecasts.
2. **Visualizes** power-flow topologies in both interactive 2D schematic and 3D isometric modes.
3. **Detects** voltage and branch thermal violations in real-time.
4. **Evaluates & Compares** corrective dispatch actions:
   - Battery Discharge
   - Feeder Reconfiguration (Tie-Line Switching)
   - Limited Solar Curtailment
   - **Infeasible Action Handling:** Transparently demonstrates that an over-requested battery discharge is technically not feasible due to SOC depletion constraints.
5. **Demonstrates Before/After Outcomes** with quantitative validation.

---

## 2. Core Product Workflow

Rather than presenting a static dashboard, the platform follows an end-to-end user-driven simulation cycle:

```
USER INPUT / PRESET SELECTION
        ↓
SCENARIO CONFIGURATION (/simulation)
        ↓
TIME-BASED SOLAR + LOAD TIME-SERIES (Editable Table / Sample Generator / CSV Import)
        ↓
NETWORK & BATTERY CONSTRAINTS (Voltage Limits, Feeder Capacity, Battery SOC)
        ↓
RUN SIMULATION (Animated Multi-Step Engine Tracker)
        ↓
DIGITAL TWIN TELEMETRY UPDATES (Bus Voltages, Feeder Ampacities, Substation Power)
        ↓
POWER-FLOW RESULTS & VIOLATION DETECTION (Over-Voltage, Under-Voltage, Line Overload)
        ↓
CORRECTIVE ACTION DISPATCH (Battery Discharge, Feeder Switching, Solar Curtailment)
        ↓
FEASIBILITY AUDIT (Feasible vs. Infeasible due to Battery SOC / Technical Constraints)
        ↓
BEFORE / AFTER QUANTITATIVE COMPARISON
```

---

## 3. Technology Stack

- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with control-room theme tokens
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts:** [Recharts](https://recharts.org/)
- **3D Visualization:** [Three.js](https://threejs.org/) + [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) + [@react-three/drei](https://github.com/pmndrs/drei)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Data Validation:** [Zod](https://zod.dev/)
- **API Client:** [Axios](https://axios-http.com/)

---

## 4. Installation & Local Development

Ensure you have [Node.js](https://nodejs.org/) (v18+ recommended) installed.

```bash
# Clone the repository and enter the directory
cd TeamXsparK

# Install dependencies
npm install

# Start development server
npm run dev
```

The application runs at: `http://localhost:5173/`

### Production Build Validation
```bash
npm run build
```

---

## 5. Simulation Setup & Data Input (`/simulation`)

Accessible via the primary navigation and the prominent **"+ New Simulation"** button in the header, the Simulation Setup interface provides:

1. **Scenario Metadata:** Scenario name, description, simulation date, duration (6h, 12h, 24h), and time resolution (15m, 30m, 1h).
2. **Preset Selector:** One-click pre-population for 5 benchmarks (*Normal Day, High Solar, Evening Peak, High Solar + Low Load, Extreme / Infeasible*). Selecting a preset populates the form for inspection and editing rather than auto-submitting.
3. **Manual Solar Generation Input:**
   - *Simple Mode:* Installed Solar Capacity (kW) and current generation with instant boundary validation.
   - *Time-Series Mode:* Interactive, scrollable table with inline editing, row addition, row deletion, and a **"Generate Sample Solar Profile"** generator producing a realistic daytime bell curve.
4. **Manual Load Demand Input:**
   - *Simple Mode:* Peak Load (kW) and current load.
   - *Time-Series Mode:* Editable hourly demand profile with a **"Generate Sample Load Profile"** generator mimicking commercial and residential diurnal peaks.
5. **Live Interactive Chart:** Recharts preview showing instantaneous solar generation (amber) vs. load demand (blue) as values are edited.
6. **Local CSV Uploader:**
   - Drag-and-drop or file upload for `timestamp,solar_kw,load_kw` files.
   - Client-side parsing, format validation, timestamp duplicate checking, and modal preview before committing data.
7. **Network Constraints Configuration:**
   - Minimum voltage threshold ($0.95\text{ pu}$ default)
   - Maximum voltage threshold ($1.05\text{ pu}$ default)
   - Feeder loading threshold ($100\%$ default)
   - Topology configuration: *Normal* vs. *Alternative* (F-02 $\rightarrow$ F-03 tie-line energized)
8. **Battery Storage Configuration:**
   - Rated Capacity (kWh)
   - Initial State of Charge (SOC %) with real-time visual progress gauge
   - Maximum Charge & Discharge Power (kW)
   - Automated low SOC warnings ($\le 20\%$)
9. **Pre-Execution Review:** Quantitative audit showing peak solar, peak demand, net surplus/deficit, and data points before triggering simulation.
10. **Multi-Step Simulation Progress Tracker:**
    - Step 1: Initializing Digital Twin
    - Step 2: Loading Time-Series Data
    - Step 3: Running Power-Flow Analysis
    - Step 4: Checking Equipment Limits
    - Step 5: Evaluating Corrective Actions

---

## 6. Three Demo Scenarios for Judges

### Scenario A: High Solar + Low Load (Over-Voltage Violation & Resolution)
1. Navigate to `/simulation` and click the **High Solar + Low Load** preset button.
2. Review the input: Solar Capacity = `250 kW`, Noon Solar Generation = `240 kW`, Load = `120 kW`, Battery SOC = `62%`.
3. Click **"Run Full Simulation"** and observe the multi-step progress modal.
4. On the resulting Dashboard:
   - **Bus 3 (B3)** turns glowing red with an over-voltage violation (`1.074 pu` > statutory limit of `1.05 pu`).
   - **Feeder F-02** turns red indicating line overload (`108%` > limit of `100%`).
5. Click **"Evaluate Actions"** or scroll to Corrective Actions.
6. Observe that **Feeder Reconfiguration (F-02 → F-03)** is recommended.
7. Click **"Simulate Action"**:
   - Voltage drops: `1.074 pu` $\rightarrow$ `1.038 pu`
   - Feeder loading reduces: `108%` $\rightarrow$ `92%`
   - Violations resolved: `2` $\rightarrow$ `0`
   - Network status achieves: `✓ Safe` with `96%` renewable utilization.

### Scenario B: Evening Peak (High Load Congestion)
1. Select the **Evening Peak** preset on `/simulation`.
2. Inspect values: Solar = `70 kW` (sunset drop), Load = `180 kW` (evening residential spike), Battery SOC = `30%`.
3. Run simulation: Digital twin exhibits feeder thermal stress.
4. Evaluate actions: **Battery Discharge (-40 kW)** offsets substation feeder current and relieves thermal congestion.

### Scenario C: Extreme / Infeasible (Honest Technical Failure Representation)
1. Select the **Extreme / Infeasible** preset on `/simulation`.
2. Observe critical conditions: Solar = `250 kW`, Load = `80 kW`, Battery SOC = `15%` (depleted).
3. Run simulation: Over-voltage and overload violations are flagged.
4. In Corrective Actions, examine **Max Battery Discharge (-80 kW)**:
   - Status: **NOT FEASIBLE**
   - Reason: `Requested discharge exceeds available battery energy/power constraints. Battery SOC too low (15% <= 20% safe floor).`
5. Switch to **Solar Curtailment (-30 kW)**:
   - Status: **FEASIBLE**
   - Resolves over-voltage while honestly capturing battery dispatch infeasibility.

---

## 7. Interactive Time-Playback Engine

- **Scrub Controls:** Header includes time scrubber slider (`06:00` to `24:00`), Step Back (-1h), Step Forward (+1h), and Play/Pause.
- **Dynamic Playback:** Clicking **Play** advances hour-by-hour through the user's simulation results, updating:
  - Bus voltages (e.g., B3 climbs toward solar noon peak and recedes)
  - Feeder loading percentages
  - Battery SOC
  - Real-time active violations

---

## 8. Layout Stability & Polish

- **No Overlapping Cards:** All panels use CSS Grid with `min-width: 0`, `min-height: 0`, and explicit responsive column definitions.
- **Aspect-Ratio Network Container:** 2D and 3D digital twins employ responsive aspect ratio containers (`aspect-[4/3]`, `max-h-[640px]`, `min-h-[420px]`) that scale seamlessly across 1366x768, 1440x900, and 1920x1080 viewports.
- **Internal Panel Scrolling:** Telemetry cards, violation logs, and time-series tables scroll internally without breaking page height or causing layout collision.

---

## 9. Future FastAPI Backend Integration Contract

The service layer is built on `apiClient.ts` (Axios). When the backend is ready:
1. Set `VITE_USE_MOCK_API=false` in `.env`.
2. Set `VITE_API_BASE_URL=http://localhost:8000/api`.

### Target REST Endpoints
- `POST /api/simulations/run`: Ingests `SimulationInput`, executes AC power-flow, returns `FullSimulationResult`.
- `POST /api/simulation/power-flow`: Computes single-timestamp nodal power-flow state.
- `POST /api/simulation/corrective-actions`: Formulates and solves optimal dispatch and feasibility checks.
- `GET /api/forecast/timeseries`: Serves Random Forest ML predictions for solar and load.

---

## 10. License

Built for the Hackathon — Renewable Distribution Grid Digital Twin. All rights reserved.

