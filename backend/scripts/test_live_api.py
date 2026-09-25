import sys
import httpx

# Ensure utf-8 stdout
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

base_url = "http://127.0.0.1:8000/api"

print("Testing Health...")
r = httpx.get(f"{base_url}/health")
print("Health:", r.status_code, r.json())
assert r.status_code == 200

print("Testing Scenarios...")
r = httpx.get(f"{base_url}/scenarios")
print("Scenarios:", r.status_code, len(r.json()), "scenarios returned")
assert r.status_code == 200

print("Testing Grid Network...")
r = httpx.get(f"{base_url}/grid/network")
print("Network:", r.status_code, len(r.json()["buses"]), "buses returned")
assert r.status_code == 200

print("Testing Forecast...")
r = httpx.get(f"{base_url}/forecast/timeseries?horizon=24")
print("Forecast:", r.status_code, len(r.json()["dataPoints"]), "datapoints returned")
assert r.status_code == 200

print("Testing Simulation Run...")
payload = {
    "scenarioName": "High Solar + Low Load",
    "installedSolarCapacityKw": 250.0,
    "currentSolarKw": 240.0,
    "solarTimeSeries": [
        {"id": "s1", "time": "12:00", "solarKw": 240.0},
        {"id": "s2", "time": "13:15", "solarKw": 250.0}
    ],
    "peakLoadKw": 180.0,
    "currentLoadKw": 120.0,
    "loadTimeSeries": [
        {"id": "l1", "time": "12:00", "loadKw": 110.0},
        {"id": "l2", "time": "13:15", "loadKw": 120.0}
    ],
    "networkConfig": {
        "voltageMinPu": 0.95,
        "voltageMaxPu": 1.05,
        "feederLoadingLimitPercent": 100.0,
        "transformerLoadingLimitPercent": 100.0,
        "feederTopology": "normal"
    },
    "batteryConfig": {
        "capacityKwh": 100.0,
        "initialSocPercent": 62.0,
        "maxChargeKw": 40.0,
        "maxDischargeKw": 40.0
    }
}
r = httpx.post(f"{base_url}/simulations/run", json=payload)
print("Simulation Run:", r.status_code)
data = r.json()
print("Violations:", data["summary"]["initialViolations"])
print("Recommended Action:", data["summary"]["recommendedAction"])
assert r.status_code == 200

print("Testing Action Execution (ACT-02)...")
r = httpx.post(f"{base_url}/simulation/actions/ACT-02/execute")
print("Action Execution:", r.status_code, r.json()["success"])
assert r.status_code == 200

print("\nALL LIVE API ENDPOINTS VERIFIED SUCCESSFULLY!")
