from typing import Dict, List, Optional
from app.schemas.network import GridNetwork, Bus, Feeder


class NetworkTopology:
    """
    Manages distribution grid graph topology, branch impedances, and switchable tie-lines.
    """
    def __init__(self, is_alternative_topology: bool = False):
        self.is_alternative = is_alternative_topology
        # Branch impedance parameters (per-unit on 1 MVA, 11 kV base)
        # R (resistance), X (reactance), Capacity (kW)
        self.branch_params = {
            "F-01": {"from": "TX-MAIN", "to": "B1", "r": 0.012, "x": 0.015, "capacity_kw": 600.0},
            "F-LINE-12": {"from": "B1", "to": "B2", "r": 0.018, "x": 0.022, "capacity_kw": 450.0},
            "F-02": {"from": "B2", "to": "B3", "r": 0.025, "x": 0.035, "capacity_kw": 300.0},
            "F-03": {"from": "B1", "to": "B3", "r": 0.020, "x": 0.028, "capacity_kw": 350.0}, # Tie-line
            "F-04": {"from": "B3", "to": "B4", "r": 0.030, "x": 0.040, "capacity_kw": 250.0},
        }

    def get_active_branches(self) -> List[str]:
        if self.is_alternative:
            # Reconfigured: F-03 is energized, F-02 is opened or relieved
            return ["F-01", "F-LINE-12", "F-03", "F-04"]
        else:
            # Normal radial topology: F-02 is energized, F-03 is normally open
            return ["F-01", "F-LINE-12", "F-02", "F-04"]
