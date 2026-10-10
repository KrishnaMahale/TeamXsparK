from typing import Tuple, Optional
from app.schemas.battery import BatteryStorageConfig


class BatteryEngine:
    """
    Electrochemical battery storage model for distribution grid control.
    Standard simulation timestep resolution: 15 minutes (0.25 hours).
    
    Sign convention:
    - power_kw > 0: Discharging / grid injection (energy extracted, SOC decreases).
    - power_kw < 0: Charging / grid absorption (energy stored, SOC increases).
    """

    def __init__(self, config: BatteryStorageConfig):
        self.capacity_kwh = float(config.capacityKwh)
        self.soc_pct = float(config.initialSocPercent)
        self.max_charge_kw = float(config.maxChargeKw)
        self.max_discharge_kw = float(config.maxDischargeKw)
        self.min_soc_pct = 20.0
        self.max_soc_pct = 95.0
        self.efficiency = 0.92

    def validate_duration(self, duration_hours: Optional[float]) -> float:
        """Validates that timestep duration is strictly positive."""
        if duration_hours is None or duration_hours <= 0:
            raise ValueError(f"Invalid duration {duration_hours} hours. Timestep duration must be strictly positive.")
        return float(duration_hours)

    def calculate_grid_energy_kwh(self, power_kw: float, duration_hours: float = 0.25) -> float:
        """
        Calculates grid-side energy magnitude (kWh) before efficiency losses.
        E.g. 40 kW over 0.25 hours = 10.0 kWh.
        """
        dt = self.validate_duration(duration_hours)
        return round(abs(float(power_kw)) * dt, 4)

    def calculate_battery_energy_kwh(self, power_kw: float, duration_hours: float = 0.25) -> float:
        """
        Calculates electrochemical battery energy (kWh) accounting for internal efficiency:
        - Discharge (>0): E_bat = (P * dt) / efficiency (more energy extracted)
        - Charge (<0): E_bat = (|P| * dt) * efficiency (less energy stored)
        """
        dt = self.validate_duration(duration_hours)
        p = float(power_kw)
        if p > 0:
            return round((p * dt) / self.efficiency, 4)
        elif p < 0:
            return round((abs(p) * dt) * self.efficiency, 4)
        return 0.0

    def calculate_soc_delta(self, power_kw: float, duration_hours: float = 0.25) -> float:
        """
        Calculates signed SOC percentage change:
        - Positive power (discharge) yields negative delta (SOC decreases)
        - Negative power (charge) yields positive delta (SOC increases)
        """
        if self.capacity_kwh <= 0:
            return 0.0
        e_bat = self.calculate_battery_energy_kwh(power_kw, duration_hours)
        pct_delta = (e_bat / self.capacity_kwh) * 100.0
        return -pct_delta if power_kw > 0 else (pct_delta if power_kw < 0 else 0.0)

    def get_max_feasible_discharge_kw(self, duration_hours: float = 0.25) -> float:
        """
        Returns the maximum feasible discharge power (kW) bounded by inverter rating
        and available energy above min_soc_pct.
        """
        dt = self.validate_duration(duration_hours)
        if self.soc_pct <= self.min_soc_pct:
            return 0.0
        reserve_pct = self.soc_pct - self.min_soc_pct
        reserve_kwh = (reserve_pct / 100.0) * self.capacity_kwh
        p_reserve = (reserve_kwh * self.efficiency) / dt
        return max(0.0, min(self.max_discharge_kw, round(p_reserve, 2)))

    def get_max_feasible_charge_kw(self, duration_hours: float = 0.25) -> float:
        """
        Returns the maximum feasible charge power (kW) bounded by inverter rating
        and available capacity below max_soc_pct.
        """
        dt = self.validate_duration(duration_hours)
        if self.soc_pct >= self.max_soc_pct:
            return 0.0
        headroom_pct = self.max_soc_pct - self.soc_pct
        headroom_kwh = (headroom_pct / 100.0) * self.capacity_kwh
        p_headroom = headroom_kwh / (dt * self.efficiency)
        return max(0.0, min(self.max_charge_kw, round(p_headroom, 2)))

    def can_discharge(self, requested_kw: float, duration_hours: float = 0.25) -> Tuple[bool, str]:
        if duration_hours is None or duration_hours <= 0:
            return False, f"Invalid duration ({duration_hours} hours). Duration must be greater than zero."

        if requested_kw < 0:
            return False, f"Requested discharge power must be non-negative ({requested_kw} kW)."

        if requested_kw == 0.0:
            return True, ""

        if requested_kw > self.max_discharge_kw:
            return False, f"Requested discharge ({requested_kw} kW) exceeds maximum discharge rating ({self.max_discharge_kw} kW)."

        needed_kwh = (requested_kw * duration_hours) / self.efficiency
        available_kwh = ((self.soc_pct - self.min_soc_pct) / 100.0) * self.capacity_kwh

        if available_kwh <= 0 or self.soc_pct <= self.min_soc_pct:
            return False, f"Battery SOC too low ({self.soc_pct:.1f}% <= {self.min_soc_pct:.1f}% safe floor)."

        if needed_kwh > available_kwh:
            mins = int(round(duration_hours * 60))
            return False, f"Requested battery discharge ({requested_kw} kW for {mins}m) exceeds available energy reserves ({available_kwh:.1f} kWh available above safe floor)."

        return True, ""

    def can_charge(self, requested_kw: float, duration_hours: float = 0.25) -> Tuple[bool, str]:
        if duration_hours is None or duration_hours <= 0:
            return False, f"Invalid duration ({duration_hours} hours). Duration must be greater than zero."

        if requested_kw < 0:
            return False, f"Requested charge power must be non-negative ({requested_kw} kW)."

        if requested_kw == 0.0:
            return True, ""

        if requested_kw > self.max_charge_kw:
            return False, f"Requested charge ({requested_kw} kW) exceeds maximum charge rating ({self.max_charge_kw} kW)."

        available_capacity_kwh = ((self.max_soc_pct - self.soc_pct) / 100.0) * self.capacity_kwh
        added_kwh = (requested_kw * duration_hours) * self.efficiency

        if available_capacity_kwh <= 0 or self.soc_pct >= self.max_soc_pct:
            return False, f"Battery SOC already at maximum ceiling ({self.soc_pct:.1f}% >= {self.max_soc_pct:.1f}%)."

        if added_kwh > available_capacity_kwh:
            return False, f"Requested battery charge exceeds available capacity ceiling."

        return True, ""

    def apply_dispatch(self, power_kw: float, duration_hours: float = 0.25) -> float:
        """
        power_kw > 0 => discharging (energy extracted)
        power_kw < 0 => charging (energy stored)
        Returns new SOC percent clamped to [0.0, 100.0].
        """
        if duration_hours is None or duration_hours <= 0:
            return self.soc_pct

        if power_kw > 0:
            # Discharging
            energy_kwh = (power_kw * duration_hours) / self.efficiency
            soc_delta = (energy_kwh / self.capacity_kwh) * 100.0
            self.soc_pct = max(0.0, round(self.soc_pct - soc_delta, 4))
        elif power_kw < 0:
            # Charging
            charge_kw = abs(power_kw)
            energy_kwh = (charge_kw * duration_hours) * self.efficiency
            soc_delta = (energy_kwh / self.capacity_kwh) * 100.0
            self.soc_pct = min(100.0, round(self.soc_pct + soc_delta, 4))

        return self.soc_pct
