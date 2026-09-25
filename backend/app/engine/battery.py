from typing import Tuple
from app.schemas.battery import BatteryStorageConfig


class BatteryEngine:
    def __init__(self, config: BatteryStorageConfig):
        self.capacity_kwh = config.capacityKwh
        self.soc_pct = config.initialSocPercent
        self.max_charge_kw = config.maxChargeKw
        self.max_discharge_kw = config.maxDischargeKw
        self.min_soc_pct = 20.0
        self.max_soc_pct = 95.0
        self.efficiency = 0.92

    def can_discharge(self, requested_kw: float, duration_hours: float = 0.5) -> Tuple[bool, str]:
        if requested_kw > self.max_discharge_kw:
            return False, f"Requested discharge ({requested_kw} kW) exceeds maximum discharge rating ({self.max_discharge_kw} kW)."

        needed_kwh = (requested_kw * duration_hours) / self.efficiency
        available_kwh = ((self.soc_pct - self.min_soc_pct) / 100.0) * self.capacity_kwh

        if available_kwh <= 0 or self.soc_pct <= self.min_soc_pct:
            return False, f"Battery SOC too low ({self.soc_pct:.1f}% <= {self.min_soc_pct:.1f}% safe floor)."

        if needed_kwh > available_kwh:
            return False, f"Requested battery discharge ({requested_kw} kW for {int(duration_hours*60)}m) exceeds available energy reserves ({available_kwh:.1f} kWh available above safe floor)."

        return True, ""

    def can_charge(self, requested_kw: float, duration_hours: float = 0.5) -> Tuple[bool, str]:
        if requested_kw > self.max_charge_kw:
            return False, f"Requested charge ({requested_kw} kW) exceeds maximum charge rating ({self.max_charge_kw} kW)."

        available_capacity_kwh = ((self.max_soc_pct - self.soc_pct) / 100.0) * self.capacity_kwh
        added_kwh = (requested_kw * duration_hours) * self.efficiency

        if available_capacity_kwh <= 0 or self.soc_pct >= self.max_soc_pct:
            return False, f"Battery SOC already at maximum ceiling ({self.soc_pct:.1f}% >= {self.max_soc_pct:.1f}%)."

        if added_kwh > available_capacity_kwh:
            return False, f"Requested battery charge exceeds available capacity ceiling."

        return True, ""

    def apply_dispatch(self, power_kw: float, duration_hours: float = 0.5) -> float:
        """
        power_kw > 0 => discharging (energy extracted)
        power_kw < 0 => charging (energy stored)
        Returns new SOC percent.
        """
        if power_kw > 0:
            # Discharging
            energy_kwh = (power_kw * duration_hours) / self.efficiency
            soc_delta = (energy_kwh / self.capacity_kwh) * 100.0
            self.soc_pct = max(0.0, self.soc_pct - soc_delta)
        elif power_kw < 0:
            # Charging
            charge_kw = abs(power_kw)
            energy_kwh = (charge_kw * duration_hours) * self.efficiency
            soc_delta = (energy_kwh / self.capacity_kwh) * 100.0
            self.soc_pct = min(100.0, self.soc_pct + soc_delta)

        return self.soc_pct
