from enum import Enum


class ComponentStatus(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"


class ComponentType(str, Enum):
    BUS = "bus"
    FEEDER = "feeder"
    SOLAR = "solar"
    BATTERY = "battery"
    LOAD = "load"
    TRANSFORMER = "transformer"
    SUBSTATION = "substation"
