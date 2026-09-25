from pydantic import BaseModel, Field


class BatteryStorageConfig(BaseModel):
    capacityKwh: float = Field(default=100.0, ge=1.0, description="Rated storage capacity in kWh")
    initialSocPercent: float = Field(default=62.0, ge=0.0, le=100.0, description="Initial State of Charge (%)")
    maxChargeKw: float = Field(default=40.0, ge=0.0, description="Max charge power rating in kW")
    maxDischargeKw: float = Field(default=40.0, ge=0.0, description="Max discharge power rating in kW")
