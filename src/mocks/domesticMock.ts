import {
  HouseNode,
  DomesticTransformer,
  StreetSegment,
  DomesticGridNetwork,
  DomesticGridViolation,
  DomesticPreset,
  DomesticControlAction,
  DomesticTimeSeriesPoint,
} from '../types/domestic'

export const baseHouses: HouseNode[] = [
  {
    id: 'HOUSE-01',
    name: 'Maple Villa',
    address: '102 Sunburst Way',
    houseNumber: 1,
    distanceMeters: 30,
    phase: 'L1',
    coords: { x: 190, y: 140 },
    rooftopSolar: {
      hasSolar: true,
      installedCapacityKw: 5.5,
      panelCount: 14,
      panelType: '400W Monocrystalline PERC',
      cellTechnology: 'Mono PERC Multi-Busbar (9BB)',
      moduleWattageW: 400,
      totalSurfaceAreaM2: 27.3,
      tiltDeg: 28,
      azimuth: '180° True South',
      irradianceWm2: 960,
      ambientTempC: 31,
      cellTemperatureC: 56.4,
      tempCoefficientPmax: -0.32,
      dcPowerGeneratedKw: 4.88,
      mpptEfficiencyPercent: 99.4,
      inverterCapacityKw: 5.0,
      inverterModel: 'SolarEdge SE5000H HD-Wave',
      inverterEfficiencyPercent: 98.2,
      inverterDcVoltageV: 382.4,
      inverterDcCurrentA: 12.76,
      inverterAcPowerKw: 4.79,
      inverterAcCurrentA: 20.6,
      gridFrequencyHz: 50.02,
      operatingPowerFactor: 0.99,
      reactivePowerKvar: 0.12,
      voltVarActive: false,
      voltWattActive: false,
      curtailedKw: 0,
      curtailmentPercent: 0,
      currentGenerationKw: 4.79,
      dailyYieldKwh: 28.4,
      monthlyYieldKwh: 812.0,
      lifetimeMwh: 14.8,
      avoidedCo2Kg: 21.3,
    },
    battery: {
      installed: true,
      brand: 'Enphase IQ 10T Storage',
      cellChemistry: 'LFP (Lithium Iron Phosphate)',
      capacityKwh: 10.5,
      usableCapacityKwh: 10.0,
      currentSocPercent: 78,
      maxChargeKw: 3.84,
      maxDischargeKw: 3.84,
      currentPowerKw: -2.1, // Charging
      mode: 'charge',
      roundTripEfficiencyPercent: 89.5,
      dcBusVoltageV: 67.2,
      chargeCurrentA: 31.25,
      temperatureC: 28.4,
      cycleCount: 240,
      healthPercent: 98.4,
    },
    consumption: {
      currentLoadKw: 1.45,
      baseLoadKw: 0.9,
      dailyConsumptionKwh: 18.2,
      powerFactor: 0.97,
      solarSelfConsumedKw: 1.45,
      batterySelfConsumedKw: 0,
      gridImportConsumedKw: 0,
      hasEv: false,
      evCharging: false,
      evPowerKw: 0,
      activeAppliances: [
        { id: 'app-1-1', name: 'Inverter Refrigerator (Dual Zone)', powerKw: 0.22, category: 'kitchen', isActive: true, powerSource: 'solar' },
        { id: 'app-1-2', name: 'Split AC (Inverter Living Room)', powerKw: 0.95, category: 'hvac', isActive: true, powerSource: 'solar' },
        { id: 'app-1-3', name: 'Smart Home Automation & Wi-Fi', powerKw: 0.08, category: 'general', isActive: true, powerSource: 'solar' },
        { id: 'app-1-4', name: 'LED Architectural Lighting', powerKw: 0.2, category: 'general', isActive: true, powerSource: 'solar' },
      ],
    },
    telemetry: {
      voltageV: 232.4,
      voltagePu: 1.010,
      nominalVoltageV: 230,
      phaseVoltageL1: 232.4,
      phaseVoltageL2: 235.8,
      phaseVoltageL3: 233.1,
      voltageUnbalanceFactorPercent: 0.8,
      currentAmps: 5.3,
      netPowerKw: 1.24, // Exporting
      flowDirection: 'export',
      powerFactor: 0.99,
      reactivePowerKvar: 0.12,
      frequencyHz: 50.02,
      thdVoltagePercent: 1.4,
      lineLossesKw: 0.04,
      status: 'normal',
      selfConsumptionPercent: 74.1,
      p2pSharedKw: 0.45,
      gridExportKw: 0.79,
      gridImportKw: 0,
      dailyCostSavings: 5.2,
    },
  },
  {
    id: 'HOUSE-02',
    name: 'Oak Cottage',
    address: '104 Sunburst Way',
    houseNumber: 2,
    distanceMeters: 65,
    phase: 'L2',
    coords: { x: 330, y: 140 },
    rooftopSolar: {
      hasSolar: true,
      installedCapacityKw: 4.2,
      panelCount: 11,
      panelType: '380W All-Black Monocrystalline',
      cellTechnology: 'N-Type TOPCon Cell',
      moduleWattageW: 380,
      totalSurfaceAreaM2: 21.5,
      tiltDeg: 25,
      azimuth: '90°/270° East-West Split',
      irradianceWm2: 890,
      ambientTempC: 31,
      cellTemperatureC: 54.2,
      tempCoefficientPmax: -0.30,
      dcPowerGeneratedKw: 3.58,
      mpptEfficiencyPercent: 99.3,
      inverterCapacityKw: 4.0,
      inverterModel: 'SMA Sunny Boy 4.0-1AV',
      inverterEfficiencyPercent: 97.8,
      inverterDcVoltageV: 315.6,
      inverterDcCurrentA: 11.34,
      inverterAcPowerKw: 3.5,
      inverterAcCurrentA: 14.8,
      gridFrequencyHz: 50.02,
      operatingPowerFactor: 0.98,
      reactivePowerKvar: 0.18,
      voltVarActive: false,
      voltWattActive: false,
      curtailedKw: 0,
      curtailmentPercent: 0,
      currentGenerationKw: 3.5,
      dailyYieldKwh: 20.4,
      monthlyYieldKwh: 580.0,
      lifetimeMwh: 11.2,
      avoidedCo2Kg: 15.6,
    },
    consumption: {
      currentLoadKw: 0.92,
      baseLoadKw: 0.6,
      dailyConsumptionKwh: 12.4,
      powerFactor: 0.96,
      solarSelfConsumedKw: 0.92,
      batterySelfConsumedKw: 0,
      gridImportConsumedKw: 0,
      hasEv: false,
      evCharging: false,
      evPowerKw: 0,
      activeAppliances: [
        { id: 'app-2-1', name: 'Smart Refrigerator', powerKw: 0.18, category: 'kitchen', isActive: true, powerSource: 'solar' },
        { id: 'app-2-2', name: 'Home Office Workstation & Monitors', powerKw: 0.37, category: 'general', isActive: true, powerSource: 'solar' },
        { id: 'app-2-3', name: 'Ceiling BLDC Fans & Lights', powerKw: 0.22, category: 'general', isActive: true, powerSource: 'solar' },
        { id: 'app-2-4', name: 'UV Water Purifier', powerKw: 0.15, category: 'kitchen', isActive: true, powerSource: 'solar' },
      ],
    },
    telemetry: {
      voltageV: 236.8,
      voltagePu: 1.030,
      nominalVoltageV: 230,
      phaseVoltageL1: 232.8,
      phaseVoltageL2: 236.8,
      phaseVoltageL3: 233.5,
      voltageUnbalanceFactorPercent: 1.1,
      currentAmps: 10.9,
      netPowerKw: 2.58, // Exporting
      flowDirection: 'export',
      powerFactor: 0.98,
      reactivePowerKvar: 0.18,
      frequencyHz: 50.02,
      thdVoltagePercent: 1.6,
      lineLossesKw: 0.08,
      status: 'normal',
      selfConsumptionPercent: 26.3,
      p2pSharedKw: 0.95,
      gridExportKw: 1.63,
      gridImportKw: 0,
      dailyCostSavings: 4.1,
    },
  },
  {
    id: 'HOUSE-03',
    name: 'Pine Residence',
    address: '106 Sunburst Way',
    houseNumber: 3,
    distanceMeters: 100,
    phase: 'L3',
    coords: { x: 470, y: 140 },
    rooftopSolar: {
      hasSolar: true,
      installedCapacityKw: 7.6,
      panelCount: 19,
      panelType: '400W Bifacial Dual-Glass',
      cellTechnology: 'N-Type TOPCon Bifacial (Albedo +12%)',
      moduleWattageW: 400,
      totalSurfaceAreaM2: 37.1,
      tiltDeg: 30,
      azimuth: '180° True South',
      irradianceWm2: 975,
      ambientTempC: 31,
      cellTemperatureC: 58.6,
      tempCoefficientPmax: -0.30,
      dcPowerGeneratedKw: 7.12,
      mpptEfficiencyPercent: 99.5,
      inverterCapacityKw: 7.0,
      inverterModel: 'Tesla Solar Inverter 7.6kW',
      inverterEfficiencyPercent: 98.4,
      inverterDcVoltageV: 412.0,
      inverterDcCurrentA: 17.28,
      inverterAcPowerKw: 6.95,
      inverterAcCurrentA: 29.1,
      gridFrequencyHz: 50.02,
      operatingPowerFactor: 0.99,
      reactivePowerKvar: 0.14,
      voltVarActive: false,
      voltWattActive: false,
      curtailedKw: 0,
      curtailmentPercent: 0,
      currentGenerationKw: 6.95,
      dailyYieldKwh: 41.2,
      monthlyYieldKwh: 1180.0,
      lifetimeMwh: 22.4,
      avoidedCo2Kg: 31.8,
    },
    battery: {
      installed: true,
      brand: 'Tesla Powerwall 2 Plus',
      cellChemistry: 'NMC (Lithium Nickel Manganese Cobalt)',
      capacityKwh: 13.5,
      usableCapacityKwh: 13.5,
      currentSocPercent: 84,
      maxChargeKw: 5.0,
      maxDischargeKw: 5.0,
      currentPowerKw: -3.5, // Charging
      mode: 'charge',
      roundTripEfficiencyPercent: 90.0,
      dcBusVoltageV: 400.0,
      chargeCurrentA: 8.75,
      temperatureC: 29.2,
      cycleCount: 310,
      healthPercent: 96.8,
    },
    consumption: {
      currentLoadKw: 2.15,
      baseLoadKw: 1.1,
      dailyConsumptionKwh: 27.6,
      powerFactor: 0.98,
      solarSelfConsumedKw: 2.15,
      batterySelfConsumedKw: 0,
      gridImportConsumedKw: 0,
      hasEv: true,
      evCharging: false,
      evPowerKw: 0,
      evSocPercent: 72,
      activeAppliances: [
        { id: 'app-3-1', name: 'Smart Inverter French-Door Fridge', powerKw: 0.28, category: 'kitchen', isActive: true, powerSource: 'solar' },
        { id: 'app-3-2', name: 'Central Heat Pump (Variable Speed)', powerKw: 1.45, category: 'hvac', isActive: true, powerSource: 'solar' },
        { id: 'app-3-3', name: 'Media Center & Workstations', powerKw: 0.42, category: 'general', isActive: true, powerSource: 'solar' },
      ],
    },
    telemetry: {
      voltageV: 239.5,
      voltagePu: 1.041,
      nominalVoltageV: 230,
      phaseVoltageL1: 233.2,
      phaseVoltageL2: 238.4,
      phaseVoltageL3: 239.5,
      voltageUnbalanceFactorPercent: 1.4,
      currentAmps: 5.4,
      netPowerKw: 1.3, // Exporting
      flowDirection: 'export',
      powerFactor: 0.99,
      reactivePowerKvar: 0.14,
      frequencyHz: 50.02,
      thdVoltagePercent: 1.7,
      lineLossesKw: 0.06,
      status: 'normal',
      selfConsumptionPercent: 81.3,
      p2pSharedKw: 0.8,
      gridExportKw: 0.5,
      gridImportKw: 0,
      dailyCostSavings: 7.2,
    },
  },
  {
    id: 'HOUSE-04',
    name: 'Cedar House (No Solar)',
    address: '108 Sunburst Way',
    houseNumber: 4,
    distanceMeters: 135,
    phase: 'L1',
    coords: { x: 610, y: 140 },
    rooftopSolar: {
      hasSolar: false,
      installedCapacityKw: 0,
      panelCount: 0,
      panelType: 'None (Tenant Occupied / Heavy Tree Canopy)',
      cellTechnology: 'N/A',
      moduleWattageW: 0,
      totalSurfaceAreaM2: 0,
      tiltDeg: 0,
      azimuth: 'N/A',
      irradianceWm2: 0,
      ambientTempC: 31,
      cellTemperatureC: 31,
      tempCoefficientPmax: 0,
      dcPowerGeneratedKw: 0,
      mpptEfficiencyPercent: 0,
      inverterCapacityKw: 0,
      inverterModel: 'None',
      inverterEfficiencyPercent: 0,
      inverterDcVoltageV: 0,
      inverterDcCurrentA: 0,
      inverterAcPowerKw: 0,
      inverterAcCurrentA: 0,
      gridFrequencyHz: 50.02,
      operatingPowerFactor: 0.96,
      reactivePowerKvar: 0.45,
      voltVarActive: false,
      voltWattActive: false,
      curtailedKw: 0,
      curtailmentPercent: 0,
      currentGenerationKw: 0,
      dailyYieldKwh: 0,
      monthlyYieldKwh: 0,
      lifetimeMwh: 0,
      avoidedCo2Kg: 0,
    },
    consumption: {
      currentLoadKw: 1.85,
      baseLoadKw: 1.0,
      dailyConsumptionKwh: 19.5,
      powerFactor: 0.96,
      solarSelfConsumedKw: 0,
      batterySelfConsumedKw: 0,
      gridImportConsumedKw: 1.85,
      hasEv: false,
      evCharging: false,
      evPowerKw: 0,
      activeAppliances: [
        { id: 'app-4-1', name: 'Standard Refrigerator', powerKw: 0.32, category: 'kitchen', isActive: true, powerSource: 'grid' },
        { id: 'app-4-2', name: 'Window AC (Master Bedroom)', powerKw: 1.15, category: 'hvac', isActive: true, powerSource: 'grid' },
        { id: 'app-4-3', name: 'Television & Audio System', powerKw: 0.23, category: 'general', isActive: true, powerSource: 'grid' },
        { id: 'app-4-4', name: 'General Lighting & Standby', powerKw: 0.15, category: 'general', isActive: true, powerSource: 'grid' },
      ],
    },
    telemetry: {
      voltageV: 238.2,
      voltagePu: 1.036,
      nominalVoltageV: 230,
      phaseVoltageL1: 238.2,
      phaseVoltageL2: 242.1,
      phaseVoltageL3: 240.2,
      voltageUnbalanceFactorPercent: 1.2,
      currentAmps: 7.7,
      netPowerKw: -1.85, // Importing green energy from neighbors!
      flowDirection: 'import',
      powerFactor: 0.96,
      reactivePowerKvar: 0.45,
      frequencyHz: 50.02,
      thdVoltagePercent: 1.8,
      lineLossesKw: 0.09,
      status: 'normal',
      selfConsumptionPercent: 0,
      p2pSharedKw: 0,
      gridExportKw: 0,
      gridImportKw: 1.85,
      dailyCostSavings: 0,
    },
  },
  {
    id: 'HOUSE-05',
    name: 'Willow Bungalow',
    address: '103 Sunburst Way',
    houseNumber: 5,
    distanceMeters: 170,
    phase: 'L2',
    coords: { x: 190, y: 390 },
    rooftopSolar: {
      hasSolar: true,
      installedCapacityKw: 6.2,
      panelCount: 16,
      panelType: '390W Monocrystalline TOPCon',
      cellTechnology: 'N-Type Tunnel Oxide Passivated Contact',
      moduleWattageW: 390,
      totalSurfaceAreaM2: 31.2,
      tiltDeg: 26,
      azimuth: '180° True South',
      irradianceWm2: 970,
      ambientTempC: 31,
      cellTemperatureC: 57.8,
      tempCoefficientPmax: -0.30,
      dcPowerGeneratedKw: 5.72,
      mpptEfficiencyPercent: 99.4,
      inverterCapacityKw: 6.0,
      inverterModel: 'Fronius Primo 6.0-1',
      inverterEfficiencyPercent: 98.1,
      inverterDcVoltageV: 390.0,
      inverterDcCurrentA: 14.66,
      inverterAcPowerKw: 5.61,
      inverterAcCurrentA: 23.3,
      gridFrequencyHz: 50.02,
      operatingPowerFactor: 0.98,
      reactivePowerKvar: 0.25,
      voltVarActive: false,
      voltWattActive: false,
      curtailedKw: 0,
      curtailmentPercent: 0,
      currentGenerationKw: 5.61,
      dailyYieldKwh: 33.2,
      monthlyYieldKwh: 950.0,
      lifetimeMwh: 18.6,
      avoidedCo2Kg: 25.4,
    },
    battery: {
      installed: true,
      brand: 'BYD Battery-Box Premium HVS',
      cellChemistry: 'Cobalt-Free Lithium Iron Phosphate (LFP)',
      capacityKwh: 7.7,
      usableCapacityKwh: 7.7,
      currentSocPercent: 91,
      maxChargeKw: 3.5,
      maxDischargeKw: 3.5,
      currentPowerKw: -1.2, // Trickle charge near full
      mode: 'charge',
      roundTripEfficiencyPercent: 92.0,
      dcBusVoltageV: 307.2,
      chargeCurrentA: 3.9,
      temperatureC: 27.6,
      cycleCount: 180,
      healthPercent: 99.1,
    },
    consumption: {
      currentLoadKw: 1.34,
      baseLoadKw: 0.8,
      dailyConsumptionKwh: 15.6,
      powerFactor: 0.97,
      solarSelfConsumedKw: 1.34,
      batterySelfConsumedKw: 0,
      gridImportConsumedKw: 0,
      hasEv: false,
      evCharging: false,
      evPowerKw: 0,
      activeAppliances: [
        { id: 'app-5-1', name: 'Inverter Refrigerator', powerKw: 0.22, category: 'kitchen', isActive: true, powerSource: 'solar' },
        { id: 'app-5-2', name: 'Hybrid Heat Pump Water Heater', powerKw: 0.87, category: 'hvac', isActive: true, powerSource: 'solar' },
        { id: 'app-5-3', name: 'Smart OLED TV & Router', powerKw: 0.25, category: 'general', isActive: true, powerSource: 'solar' },
      ],
    },
    telemetry: {
      voltageV: 245.4,
      voltagePu: 1.067,
      nominalVoltageV: 230,
      phaseVoltageL1: 239.5,
      phaseVoltageL2: 245.4,
      phaseVoltageL3: 242.0,
      voltageUnbalanceFactorPercent: 1.6,
      currentAmps: 12.5,
      netPowerKw: 3.07, // Exporting
      flowDirection: 'export',
      powerFactor: 0.98,
      reactivePowerKvar: 0.25,
      frequencyHz: 50.02,
      thdVoltagePercent: 1.9,
      lineLossesKw: 0.14,
      status: 'warning',
      selfConsumptionPercent: 45.2,
      p2pSharedKw: 1.1,
      gridExportKw: 1.97,
      gridImportKw: 0,
      dailyCostSavings: 5.8,
    },
  },
  {
    id: 'HOUSE-06',
    name: 'Birch Estate',
    address: '105 Sunburst Way',
    houseNumber: 6,
    distanceMeters: 210,
    phase: 'L3',
    coords: { x: 330, y: 390 },
    rooftopSolar: {
      hasSolar: true,
      installedCapacityKw: 8.8,
      panelCount: 22,
      panelType: '400W Bifacial Monocrystalline',
      cellTechnology: 'Mono PERC Glass-Glass High Transmittance',
      moduleWattageW: 400,
      totalSurfaceAreaM2: 43.0,
      tiltDeg: 30,
      azimuth: '190° South-South-West',
      irradianceWm2: 980,
      ambientTempC: 31,
      cellTemperatureC: 59.4,
      tempCoefficientPmax: -0.32,
      dcPowerGeneratedKw: 8.14,
      mpptEfficiencyPercent: 99.5,
      inverterCapacityKw: 8.0,
      inverterModel: 'SolarEdge Energy Hub 7.6kW',
      inverterEfficiencyPercent: 98.3,
      inverterDcVoltageV: 420.0,
      inverterDcCurrentA: 19.38,
      inverterAcPowerKw: 8.0, // Clipped at 8.0 kW rated
      inverterAcCurrentA: 32.1,
      gridFrequencyHz: 50.02,
      operatingPowerFactor: 0.99,
      reactivePowerKvar: 0.35,
      voltVarActive: false,
      voltWattActive: false,
      curtailedKw: 0,
      curtailmentPercent: 0,
      currentGenerationKw: 8.0,
      dailyYieldKwh: 48.6,
      monthlyYieldKwh: 1390.0,
      lifetimeMwh: 26.5,
      avoidedCo2Kg: 38.2,
    },
    consumption: {
      currentLoadKw: 1.25,
      baseLoadKw: 0.8,
      dailyConsumptionKwh: 16.8,
      powerFactor: 0.97,
      solarSelfConsumedKw: 1.25,
      batterySelfConsumedKw: 0,
      gridImportConsumedKw: 0,
      hasEv: true,
      evCharging: false,
      evPowerKw: 0,
      evSocPercent: 68,
      activeAppliances: [
        { id: 'app-6-1', name: 'Side-by-Side Inverter Fridge', powerKw: 0.3, category: 'kitchen', isActive: true, powerSource: 'solar' },
        { id: 'app-6-2', name: 'Variable Speed Inverter AC', powerKw: 0.75, category: 'hvac', isActive: true, powerSource: 'solar' },
        { id: 'app-6-3', name: 'Home Network Server & Security', powerKw: 0.2, category: 'general', isActive: true, powerSource: 'solar' },
      ],
    },
    telemetry: {
      voltageV: 250.2,
      voltagePu: 1.088,
      nominalVoltageV: 230,
      phaseVoltageL1: 241.2,
      phaseVoltageL2: 248.6,
      phaseVoltageL3: 250.2,
      voltageUnbalanceFactorPercent: 2.1, // Warning > 2.0%
      currentAmps: 27.0,
      netPowerKw: 6.75, // Heavy export causing voltage rise!
      flowDirection: 'export',
      powerFactor: 0.99,
      reactivePowerKvar: 0.35,
      frequencyHz: 50.02,
      thdVoltagePercent: 2.1,
      lineLossesKw: 0.28,
      status: 'warning',
      selfConsumptionPercent: 15.6,
      p2pSharedKw: 1.25,
      gridExportKw: 5.5,
      gridImportKw: 0,
      dailyCostSavings: 8.4,
    },
  },
  {
    id: 'HOUSE-07',
    name: 'Elm Bungalow',
    address: '107 Sunburst Way',
    houseNumber: 7,
    distanceMeters: 250,
    phase: 'L1',
    coords: { x: 470, y: 390 },
    rooftopSolar: {
      hasSolar: true,
      installedCapacityKw: 5.2,
      panelCount: 13,
      panelType: '400W Half-Cut Mono PERC',
      cellTechnology: 'Monocrystalline Half-Cell 144 Split',
      moduleWattageW: 400,
      totalSurfaceAreaM2: 25.4,
      tiltDeg: 25,
      azimuth: '180° True South',
      irradianceWm2: 965,
      ambientTempC: 31,
      cellTemperatureC: 56.8,
      tempCoefficientPmax: -0.32,
      dcPowerGeneratedKw: 4.71,
      mpptEfficiencyPercent: 99.4,
      inverterCapacityKw: 5.0,
      inverterModel: 'GoodWe GW5000-DNS-30',
      inverterEfficiencyPercent: 97.9,
      inverterDcVoltageV: 365.0,
      inverterDcCurrentA: 12.9,
      inverterAcPowerKw: 4.61,
      inverterAcCurrentA: 18.2,
      gridFrequencyHz: 50.02,
      operatingPowerFactor: 0.98,
      reactivePowerKvar: 0.2,
      voltVarActive: false,
      voltWattActive: false,
      curtailedKw: 0,
      curtailmentPercent: 0,
      currentGenerationKw: 4.61,
      dailyYieldKwh: 26.5,
      monthlyYieldKwh: 760.0,
      lifetimeMwh: 15.1,
      avoidedCo2Kg: 20.8,
    },
    battery: {
      installed: true,
      brand: 'SolarEdge Home Battery 10kWh',
      cellChemistry: 'High-Voltage LFP',
      capacityKwh: 9.7,
      usableCapacityKwh: 9.7,
      currentSocPercent: 88,
      maxChargeKw: 5.0,
      maxDischargeKw: 5.0,
      currentPowerKw: -1.5,
      mode: 'charge',
      roundTripEfficiencyPercent: 94.5,
      dcBusVoltageV: 400.0,
      chargeCurrentA: 3.75,
      temperatureC: 28.1,
      cycleCount: 195,
      healthPercent: 97.5,
    },
    consumption: {
      currentLoadKw: 1.12,
      baseLoadKw: 0.7,
      dailyConsumptionKwh: 14.1,
      powerFactor: 0.97,
      solarSelfConsumedKw: 1.12,
      batterySelfConsumedKw: 0,
      gridImportConsumedKw: 0,
      hasEv: false,
      evCharging: false,
      evPowerKw: 0,
      activeAppliances: [
        { id: 'app-7-1', name: 'Frost-Free Refrigerator', powerKw: 0.22, category: 'kitchen', isActive: true, powerSource: 'solar' },
        { id: 'app-7-2', name: 'Inverter AC Unit', powerKw: 0.7, category: 'hvac', isActive: true, powerSource: 'solar' },
        { id: 'app-7-3', name: 'LED Lighting & Media', powerKw: 0.2, category: 'general', isActive: true, powerSource: 'solar' },
      ],
    },
    telemetry: {
      voltageV: 247.5,
      voltagePu: 1.076,
      nominalVoltageV: 230,
      phaseVoltageL1: 247.5,
      phaseVoltageL2: 252.1,
      phaseVoltageL3: 250.8,
      voltageUnbalanceFactorPercent: 1.8,
      currentAmps: 8.0,
      netPowerKw: 1.99, // Exporting
      flowDirection: 'export',
      powerFactor: 0.98,
      reactivePowerKvar: 0.2,
      frequencyHz: 50.02,
      thdVoltagePercent: 2.0,
      lineLossesKw: 0.12,
      status: 'warning',
      selfConsumptionPercent: 56.8,
      p2pSharedKw: 0.65,
      gridExportKw: 1.34,
      gridImportKw: 0,
      dailyCostSavings: 5.1,
    },
  },
  {
    id: 'HOUSE-08',
    name: 'Ash Manor (End of Line)',
    address: '109 Sunburst Way',
    houseNumber: 8,
    distanceMeters: 290,
    phase: 'L2',
    coords: { x: 610, y: 390 },
    rooftopSolar: {
      hasSolar: true,
      installedCapacityKw: 9.6,
      panelCount: 24,
      panelType: '400W N-Type TOPCon Dual-Glass',
      cellTechnology: 'N-Type TOPCon Bifacial 16-Busbar',
      moduleWattageW: 400,
      totalSurfaceAreaM2: 46.8,
      tiltDeg: 30,
      azimuth: '180° True South',
      irradianceWm2: 980,
      ambientTempC: 31,
      cellTemperatureC: 59.8,
      tempCoefficientPmax: -0.30,
      dcPowerGeneratedKw: 8.92,
      mpptEfficiencyPercent: 99.5,
      inverterCapacityKw: 9.0,
      inverterModel: 'SolarEdge SE9000H HD-Wave',
      inverterEfficiencyPercent: 98.4,
      inverterDcVoltageV: 430.0,
      inverterDcCurrentA: 20.74,
      inverterAcPowerKw: 8.78,
      inverterAcCurrentA: 34.4,
      gridFrequencyHz: 50.02,
      operatingPowerFactor: 0.99,
      reactivePowerKvar: 0.3,
      voltVarActive: false,
      voltWattActive: false,
      curtailedKw: 0,
      curtailmentPercent: 0,
      currentGenerationKw: 8.78,
      dailyYieldKwh: 52.8,
      monthlyYieldKwh: 1510.0,
      lifetimeMwh: 28.7,
      avoidedCo2Kg: 42.1,
    },
    battery: {
      installed: true,
      brand: 'Tesla Powerwall 2 Storage',
      cellChemistry: 'NMC Lithium-Ion Pack with Liquid Thermal Control',
      capacityKwh: 13.5,
      usableCapacityKwh: 13.5,
      currentSocPercent: 96, // Near 100%, cannot soak more!
      maxChargeKw: 5.0,
      maxDischargeKw: 5.0,
      currentPowerKw: -0.6, // Tapering off
      mode: 'charge',
      roundTripEfficiencyPercent: 90.0,
      dcBusVoltageV: 400.0,
      chargeCurrentA: 1.5,
      temperatureC: 30.8,
      cycleCount: 380,
      healthPercent: 95.2,
    },
    consumption: {
      currentLoadKw: 1.55,
      baseLoadKw: 1.0,
      dailyConsumptionKwh: 22.4,
      powerFactor: 0.97,
      solarSelfConsumedKw: 1.55,
      batterySelfConsumedKw: 0,
      gridImportConsumedKw: 0,
      hasEv: true,
      evCharging: false,
      evPowerKw: 0,
      evSocPercent: 80,
      activeAppliances: [
        { id: 'app-8-1', name: 'Smart Double-Door Inverter Fridge', powerKw: 0.28, category: 'kitchen', isActive: true, powerSource: 'solar' },
        { id: 'app-8-2', name: 'Multi-Split Inverter AC (2-Zone)', powerKw: 0.97, category: 'hvac', isActive: true, powerSource: 'solar' },
        { id: 'app-8-3', name: 'Whole-Home Ventilation & Automation', powerKw: 0.3, category: 'general', isActive: true, powerSource: 'solar' },
      ],
    },
    telemetry: {
      voltageV: 255.4, // Over-voltage violation (> 253V IEEE 1547 / EN 50160 limit)
      voltagePu: 1.110,
      nominalVoltageV: 230,
      phaseVoltageL1: 247.9,
      phaseVoltageL2: 255.4,
      phaseVoltageL3: 251.2,
      voltageUnbalanceFactorPercent: 3.1, // Critical Unbalance > 2.0%
      currentAmps: 25.9,
      netPowerKw: 6.63, // Large export at end of line causes acute voltage rise
      flowDirection: 'export',
      powerFactor: 0.99,
      reactivePowerKvar: 0.3,
      frequencyHz: 50.02,
      thdVoltagePercent: 2.4,
      lineLossesKw: 0.38,
      status: 'critical',
      selfConsumptionPercent: 24.5,
      p2pSharedKw: 0.9,
      gridExportKw: 5.73,
      gridImportKw: 0,
      dailyCostSavings: 9.2,
    },
  },
]

export const baseTransformer: DomesticTransformer = {
  id: 'TX-LV-01',
  name: 'Pole-Mounted Distribution Transformer',
  ratingKva: 100,
  primaryVoltageKv: 11.0,
  secondaryVoltageV: 230,
  currentLoadKw: 23.8, // Reverse flow
  currentLoadKva: 24.8,
  loadingPercent: 24.8,
  flowDirection: 'reverse_export_to_grid',
  powerFactor: 0.96,
  tapPosition: 0,
  tapRatioPercent: 0.0,
  phaseLoadingL1Percent: 18.2,
  phaseLoadingL2Percent: 34.6,
  phaseLoadingL3Percent: 21.6,
  voltageUnbalanceFactorPercent: 2.8,
  status: 'normal',
  ambientTemperatureC: 32,
  oilTemperatureC: 56,
}

export const baseSegments: StreetSegment[] = [
  { id: 'SEG-TX-01', fromNode: 'TX-LV-01', toNode: 'HOUSE-01', lengthMeters: 30, cableType: '4x70mm² Cu XLPE', rOhm: 0.008, xOhm: 0.002, currentAmps: 103.5, voltageDropV: 2.4, loadingPercent: 49.3, status: 'normal' },
  { id: 'SEG-01-02', fromNode: 'HOUSE-01', toNode: 'HOUSE-02', lengthMeters: 35, cableType: '4x70mm² Cu XLPE', rOhm: 0.009, xOhm: 0.003, currentAmps: 98.2, voltageDropV: 2.6, loadingPercent: 46.8, status: 'normal' },
  { id: 'SEG-02-03', fromNode: 'HOUSE-02', toNode: 'HOUSE-03', lengthMeters: 35, cableType: '4x70mm² Cu XLPE', rOhm: 0.009, xOhm: 0.003, currentAmps: 87.3, voltageDropV: 3.5, loadingPercent: 41.6, status: 'normal' },
  { id: 'SEG-03-04', fromNode: 'HOUSE-03', toNode: 'HOUSE-04', lengthMeters: 35, cableType: '4x70mm² Cu XLPE', rOhm: 0.009, xOhm: 0.003, currentAmps: 81.9, voltageDropV: 1.6, loadingPercent: 39.0, status: 'normal' },
  { id: 'SEG-04-05', fromNode: 'HOUSE-04', toNode: 'HOUSE-05', lengthMeters: 35, cableType: '4x50mm² Al ABC', rOhm: 0.021, xOhm: 0.003, currentAmps: 89.2, voltageDropV: 4.9, loadingPercent: 59.5, status: 'warning' },
  { id: 'SEG-05-06', fromNode: 'HOUSE-05', toNode: 'HOUSE-06', lengthMeters: 40, cableType: '4x50mm² Al ABC', rOhm: 0.024, xOhm: 0.004, currentAmps: 76.5, voltageDropV: 5.8, loadingPercent: 51.0, status: 'warning' },
  { id: 'SEG-06-07', fromNode: 'HOUSE-06', toNode: 'HOUSE-07', lengthMeters: 40, cableType: '4x50mm² Al ABC', rOhm: 0.024, xOhm: 0.004, currentAmps: 49.5, voltageDropV: 3.5, loadingPercent: 33.0, status: 'warning' },
  { id: 'SEG-07-08', fromNode: 'HOUSE-07', toNode: 'HOUSE-08', lengthMeters: 40, cableType: '4x50mm² Al ABC', rOhm: 0.024, xOhm: 0.004, currentAmps: 41.2, voltageDropV: 2.4, loadingPercent: 27.5, status: 'warning' },
]

/**
 * Advanced Engineering Power-Flow Solver for Low-Voltage Residential Rooftop Solar Feeders.
 * Evaluates real-world PV cell temperatures, NOCT thermal derating, phase allocation (L1/L2/L3),
 * voltage unbalance factors (VUF), and IEEE 1547 Volt-VAR / Volt-Watt / OLTC mitigation.
 */
export function calculateDomesticPowerFlow(
  timeStr: string = '12:30',
  preset: DomesticPreset = 'SUNNY_NOON_EXPORT',
  controlAction: DomesticControlAction = 'NONE'
): DomesticGridNetwork {
  const [hStr, mStr] = timeStr.split(':')
  const hours = (parseInt(hStr, 10) || 12) + (parseInt(mStr, 10) || 0) / 60

  // 1. Solar Irradiance Profile G(t) in W/m²
  let irradianceWm2 = 0
  if (hours >= 6.0 && hours <= 18.5) {
    const rawSin = Math.sin(((hours - 6.0) / 12.5) * Math.PI)
    irradianceWm2 = Math.round(980 * Math.max(0, rawSin ** 1.1))
  }

  // Adjust by preset
  if (preset === 'OVERCAST_IMPORT') irradianceWm2 = Math.round(irradianceWm2 * 0.28)
  if (preset === 'EVENING_PEAK') irradianceWm2 = 0

  // Ambient and Cell Temperature
  const ambientTempC = +(22.0 + 10.0 * Math.sin(((hours - 8.0) / 14.0) * Math.PI)).toFixed(1)
  const cellTempC = +(ambientTempC + ((45.0 - 20.0) / 800.0) * irradianceWm2).toFixed(1)

  // Temperature Derating Factor (gamma = -0.32% / °C above 25°C)
  const tempDerating = Math.max(0.75, 1.0 + (-0.0032 * (cellTempC - 25.0)))

  // 2. Residential Load Multiplier
  let loadFactor = 0.55
  if (hours >= 7.0 && hours <= 9.5) {
    loadFactor = 0.95 + 0.3 * Math.sin(((hours - 7.0) / 2.5) * Math.PI)
  } else if (hours >= 11.5 && hours <= 14.5) {
    loadFactor = 0.75 + 0.15 * Math.sin(((hours - 11.5) / 3.0) * Math.PI) // Daytime AC
  } else if (hours >= 17.5 && hours <= 22.5) {
    loadFactor = 1.45 + 0.65 * Math.sin(((hours - 17.5) / 5.0) * Math.PI) // Evening residential spike
  } else if (hours >= 23.0 || hours <= 5.5) {
    loadFactor = 0.38 // Night baseline
  }

  if (preset === 'EVENING_PEAK') loadFactor = Math.max(loadFactor, 1.85)

  // Transformer Tap Setting: if OLTC action is chosen, tap drops base voltage by 2.5% (-5.75V)
  let baseTransformerV = 230.0
  let tapPos = 0
  let tapRatio = 0.0
  if (controlAction === 'TRANSFORMER_TAP_CHANGE') {
    tapPos = -1
    tapRatio = -2.5
    baseTransformerV = 224.25 // Base drops from 230V -> 224.25V
  }

  // 3. Process each house
  const updatedHouses: HouseNode[] = baseHouses.map((base) => {
    const hasSolar = base.rooftopSolar.hasSolar
    
    // Ideal DC generation
    let dcPowerKw = 0
    let genKw = 0
    if (hasSolar) {
      dcPowerKw = +(base.rooftopSolar.installedCapacityKw * (irradianceWm2 / 1000.0) * tempDerating).toFixed(2)
      // MPPT & Inverter conversion
      const invertedAc = dcPowerKw * (base.rooftopSolar.mpptEfficiencyPercent / 100) * (base.rooftopSolar.inverterEfficiencyPercent / 100)
      // Inverter AC clipping
      genKw = +Math.min(base.rooftopSolar.inverterCapacityKw, invertedAc).toFixed(2)
    }

    // Dynamic Volt-Watt soft curtailment (IEEE 1547 P(V) curve)
    let curtailedKw = 0
    let voltWattActive = false
    if (controlAction === 'VOLT_WATT_THROTTLE' && hasSolar) {
      if (base.distanceMeters >= 200 && genKw > 4.8) {
        curtailedKw = +(genKw - 4.8).toFixed(2)
        genKw = 4.8
        voltWattActive = true
      }
    }

    // Household load with active EV charger
    let currentLoad = +(base.consumption.baseLoadKw * loadFactor).toFixed(2)
    let evCharging = base.consumption.hasEv && (hours >= 18.5 && hours <= 23.5)
    let evPower = evCharging ? 7.4 : 0

    // EV Smart Charging Action (V1G): absorb daytime solar surplus!
    if (controlAction === 'EV_SMART_CHARGING' && base.consumption.hasEv && hasSolar && genKw > 4.0) {
      evCharging = true
      evPower = 4.2
    }
    currentLoad = +(currentLoad + evPower).toFixed(2)

    // Battery dispatch logic
    let batSoc = base.battery ? base.battery.currentSocPercent : 0
    let batPowerKw = 0
    let batMode: 'charge' | 'discharge' | 'idle' = 'idle'

    if (base.battery && base.battery.installed) {
      const netWithoutBattery = genKw - currentLoad

      if (controlAction === 'BATTERY_PEAK_SHAVING' && netWithoutBattery > 0 && batSoc < 98) {
        // Coordinated peak shaving charge burst
        const maxChg = Math.min(base.battery.maxChargeKw, netWithoutBattery, (99.5 - batSoc) * 0.2)
        batPowerKw = -+maxChg.toFixed(2)
        batMode = 'charge'
        batSoc = Math.min(100, Math.round(batSoc + 1.2))
      } else if (netWithoutBattery > 0.5 && batSoc < 96) {
        // Standard solar surplus absorption
        const chargePower = Math.min(base.battery.maxChargeKw, netWithoutBattery * 0.8)
        batPowerKw = -+chargePower.toFixed(2)
        batMode = 'charge'
      } else if (netWithoutBattery < -0.5 && batSoc > 15 && hours >= 17.0) {
        // Evening peak discharge
        const dischargePower = Math.min(base.battery.maxDischargeKw, Math.abs(netWithoutBattery))
        batPowerKw = +dischargePower.toFixed(2)
        batMode = 'discharge'
        batSoc = Math.max(10, Math.round(batSoc - 1.1))
      }
    }

    // Direct self-consumption allocation
    const solarDirectUsed = Math.min(genKw, currentLoad)
    const batDirectUsed = batPowerKw > 0 ? Math.min(batPowerKw, currentLoad - solarDirectUsed) : 0
    const gridImportUsed = Math.max(0, currentLoad - solarDirectUsed - batDirectUsed)

    // Net power at meter
    const netPower = +(genKw - currentLoad + batPowerKw).toFixed(2)
    const isExport = netPower > 0.05
    const isImport = netPower < -0.05

    // P2P energy exchange
    let p2pShared = 0
    if (isExport) {
      p2pShared = Math.min(1.6, +(netPower * 0.35).toFixed(2))
    }

    const gridExport = isExport ? +(netPower - p2pShared).toFixed(2) : 0
    const gridImport = isImport ? Math.abs(netPower) : 0

    // Self-consumption rate
    const selfConsPercent = genKw > 0
      ? Math.min(100, Math.round(((genKw - gridExport) / genKw) * 100))
      : 0

    // Phase rebalancing action: re-route phase L2 to L1/L3 to balance voltage
    let effectivePhase = base.phase
    if (controlAction === 'PHASE_REBALANCING') {
      if (base.id === 'HOUSE-08') effectivePhase = 'L1' // Move end of line off overloaded L2
      if (base.id === 'HOUSE-05') effectivePhase = 'L3'
    }

    // Inverter Volt-VAR status
    const voltVarActive = controlAction === 'VOLT_VAR_DROOP' && hasSolar && genKw > 1.5

    // Inverter AC & DC telemetry
    const invAcCurrentA = +(genKw > 0 ? (genKw * 1000) / 230.0 : 0).toFixed(1)
    const invDcVoltageV = hasSolar ? +(360 + 50 * (irradianceWm2 / 1000.0)).toFixed(1) : 0
    const invDcCurrentA = +(dcPowerKw > 0 ? (dcPowerKw * 1000) / invDcVoltageV : 0).toFixed(2)

    return {
      ...base,
      phase: effectivePhase,
      rooftopSolar: {
        ...base.rooftopSolar,
        irradianceWm2,
        ambientTempC,
        cellTemperatureC: cellTempC,
        dcPowerGeneratedKw: dcPowerKw,
        inverterAcPowerKw: genKw,
        inverterAcCurrentA: invAcCurrentA,
        inverterDcVoltageV: invDcVoltageV,
        inverterDcCurrentA: invDcCurrentA,
        currentGenerationKw: genKw,
        curtailedKw,
        curtailmentPercent: genKw > 0 ? +((curtailedKw / (genKw + curtailedKw)) * 100).toFixed(1) : 0,
        voltVarActive,
        voltWattActive,
        operatingPowerFactor: voltVarActive ? 0.91 : 0.99,
        reactivePowerKvar: voltVarActive ? -+(genKw * 0.44).toFixed(2) : 0.12,
      },
      battery: base.battery
        ? {
            ...base.battery,
            currentSocPercent: batSoc,
            currentPowerKw: batPowerKw,
            mode: batMode,
          }
        : undefined,
      consumption: {
        ...base.consumption,
        currentLoadKw: currentLoad,
        solarSelfConsumedKw: solarDirectUsed,
        batterySelfConsumedKw: batDirectUsed,
        gridImportConsumedKw: gridImportUsed,
        evCharging,
        evPowerKw: evPower,
      },
      telemetry: {
        ...base.telemetry,
        netPowerKw: netPower,
        flowDirection: isExport ? 'export' : isImport ? 'import' : 'self_sufficient',
        p2pSharedKw: p2pShared,
        gridExportKw: gridExport,
        gridImportKw: gridImport,
        selfConsumptionPercent: selfConsPercent,
      },
    }
  })

  // 4. Calculate Phase Voltages & Low-Voltage Cable Line Currents
  const distances = [30, 65, 100, 135, 170, 210, 250, 290]
  const violations: DomesticGridViolation[] = []

  // Phase accumulators from substation
  let vPhaseL1 = baseTransformerV
  let vPhaseL2 = baseTransformerV
  let vPhaseL3 = baseTransformerV
  let prevDist = 0

  const finalizedHouses = updatedHouses.map((h, idx) => {
    const dist = distances[idx]
    const segLengthKm = (dist - prevDist) / 1000.0
    prevDist = dist

    // Cumulative downstream net power per phase
    const downstreamL1 = updatedHouses.slice(idx).filter((n) => n.phase === 'L1').reduce((s, n) => s + n.telemetry.netPowerKw, 0)
    const downstreamL2 = updatedHouses.slice(idx).filter((n) => n.phase === 'L2').reduce((s, n) => s + n.telemetry.netPowerKw, 0)
    const downstreamL3 = updatedHouses.slice(idx).filter((n) => n.phase === 'L3').reduce((s, n) => s + n.telemetry.netPowerKw, 0)

    // Cable impedance (50mm² Al ABC with neutral unbalance loop return): R = 0.88 Ohm/km, X = 0.10 Ohm/km
    const R_eff = 0.88 * segLengthKm
    const X_eff = 0.10 * segLengthKm

    // Volt-VAR reactive compensation per phase:
    // If Volt-VAR is active, inverters absorb inductive reactive power (Q < 0)
    let qL1 = downstreamL1 * 0.15
    let qL2 = downstreamL2 * 0.15
    let qL3 = downstreamL3 * 0.15

    if (controlAction === 'VOLT_VAR_DROOP') {
      if (downstreamL1 > 0) qL1 = -0.44 * downstreamL1
      if (downstreamL2 > 0) qL2 = -0.44 * downstreamL2
      if (downstreamL3 > 0) qL3 = -0.44 * downstreamL3
    }

    // Delta V = (R*P + X*Q) / V_nom
    const deltaVL1 = ((R_eff * downstreamL1 * 1000.0) + (X_eff * qL1 * 1000.0)) / 230.0
    const deltaVL2 = ((R_eff * downstreamL2 * 1000.0) + (X_eff * qL2 * 1000.0)) / 230.0
    const deltaVL3 = ((R_eff * downstreamL3 * 1000.0) + (X_eff * qL3 * 1000.0)) / 230.0

    vPhaseL1 += deltaVL1
    vPhaseL2 += deltaVL2
    vPhaseL3 += deltaVL3

    // Service drop cable from street pole into house switchboard (16mm² Cu concentric drop loop, R ~ 0.46 Ohm)
    const R_service_drop = 0.46
    const X_service_drop = 0.05
    const dropQ = h.rooftopSolar.voltVarActive ? -0.44 * h.telemetry.netPowerKw : 0.15 * h.telemetry.netPowerKw
    const deltaVServiceDrop = ((R_service_drop * h.telemetry.netPowerKw * 1000.0) + (X_service_drop * dropQ * 1000.0)) / 230.0

    // Local terminal voltage for this house
    let poleV = h.phase === 'L1' ? vPhaseL1 : h.phase === 'L2' ? vPhaseL2 : vPhaseL3
    let terminalV = +(poleV + deltaVServiceDrop).toFixed(1)
    const terminalPu = +(terminalV / 230.0).toFixed(3)

    // Voltage Unbalance Factor (VUF) = (V_max_deviation / V_avg) * 100%
    const vAvgPhase = (vPhaseL1 + vPhaseL2 + vPhaseL3) / 3.0
    const maxDev = Math.max(Math.abs(vPhaseL1 - vAvgPhase), Math.abs(vPhaseL2 - vAvgPhase), Math.abs(vPhaseL3 - vAvgPhase))
    const vufPercent = +((maxDev / vAvgPhase) * 100.0).toFixed(1)

    // Evaluate violations against IEEE 1547 / EN 50160 standards
    let status: 'normal' | 'warning' | 'critical' = 'normal'

    // 1. Over-Voltage Check (> 253.0 V continuous limit, or > 258V extreme trip risk)
    if (terminalV > 253.0) {
      status = 'critical'
      violations.push({
        id: `VIO-DOM-${h.id}-OV`,
        houseId: h.id,
        houseName: h.name,
        type: 'over_voltage',
        severity: 'critical',
        message: `Over-voltage violation (${terminalV}V > 253.0V limit) caused by high rooftop solar backfeed on Phase ${h.phase}`,
        standardRef: 'IEEE 1547-2018 / EN 50160 Clause 4.2.2.2',
        currentValue: terminalV,
        thresholdValue: 253.0,
        unit: 'V',
        timestamp: timeStr,
        resolvingActionHint: 'Enable Volt-VAR Inverter Control or Battery Peak Shaving to absorb local voltage rise.',
      })
    } else if (terminalV > 248.0) {
      status = 'warning'
      violations.push({
        id: `VIO-DOM-${h.id}-OV-WARN`,
        houseId: h.id,
        houseName: h.name,
        type: 'over_voltage',
        severity: 'warning',
        message: `High voltage warning (${terminalV}V approaching 253V ceiling)`,
        standardRef: 'EN 50160 Normative Band',
        currentValue: terminalV,
        thresholdValue: 248.0,
        unit: 'V',
        timestamp: timeStr,
        resolvingActionHint: 'Monitor end-of-line phase loading.',
      })
    } else if (terminalV < 216.0) {
      // 2. Under-Voltage Check (< 216.0 V)
      status = 'critical'
      violations.push({
        id: `VIO-DOM-${h.id}-UV`,
        houseId: h.id,
        houseName: h.name,
        type: 'under_voltage',
        severity: 'critical',
        message: `Under-voltage sag (${terminalV}V < 216.0V lower limit) under peak residential load`,
        standardRef: 'IEEE 1547 / ANSI C84.1 Range A',
        currentValue: terminalV,
        thresholdValue: 216.0,
        unit: 'V',
        timestamp: timeStr,
        resolvingActionHint: 'Dispatch residential battery storage discharge to offset grid current draw.',
      })
    }

    // 3. Phase Unbalance Check (> 2.0% IEEE 1159 limit)
    if (vufPercent > 2.0 && status === 'normal') {
      status = 'warning'
      violations.push({
        id: `VIO-DOM-${h.id}-VUF`,
        houseId: h.id,
        houseName: h.name,
        type: 'phase_imbalance',
        severity: 'warning',
        message: `Phase Voltage Unbalance (${vufPercent}% > 2.0% IEEE limit) due to uneven rooftop PV export across L1/L2/L3`,
        standardRef: 'IEEE 1159 / IEC 61000-2-2',
        currentValue: vufPercent,
        thresholdValue: 2.0,
        unit: '%',
        timestamp: timeStr,
        resolvingActionHint: 'Trigger Phase Rebalancing to redistribute single-phase solar export evenly.',
      })
    }

    return {
      ...h,
      telemetry: {
        ...h.telemetry,
        voltageV: terminalV,
        voltagePu: terminalPu,
        phaseVoltageL1: +vPhaseL1.toFixed(1),
        phaseVoltageL2: +vPhaseL2.toFixed(1),
        phaseVoltageL3: +vPhaseL3.toFixed(1),
        voltageUnbalanceFactorPercent: vufPercent,
        status,
        currentAmps: +(Math.abs(h.telemetry.netPowerKw * 1000.0) / terminalV).toFixed(1),
      },
    }
  })

  // 5. Transformer Telemetry & Loading Calculations
  const totalGen = +finalizedHouses.reduce((acc, h) => acc + h.rooftopSolar.currentGenerationKw, 0).toFixed(2)
  const totalLoad = +finalizedHouses.reduce((acc, h) => acc + h.consumption.currentLoadKw, 0).toFixed(2)
  const totalBatPower = +finalizedHouses.reduce((acc, h) => acc + (h.battery?.currentPowerKw || 0), 0).toFixed(2)
  const netGridKw = +(totalGen - totalLoad + totalBatPower).toFixed(2)

  const txLoadKw = Math.abs(netGridKw)
  const txLoadKva = +(txLoadKw / 0.96).toFixed(1)
  const txLoadingPercent = +((txLoadKva / baseTransformer.ratingKva) * 100).toFixed(1)

  // Phase loading on transformer
  const netL1Kw = finalizedHouses.filter((h) => h.phase === 'L1').reduce((s, h) => s + Math.abs(h.telemetry.netPowerKw), 0)
  const netL2Kw = finalizedHouses.filter((h) => h.phase === 'L2').reduce((s, h) => s + Math.abs(h.telemetry.netPowerKw), 0)
  const netL3Kw = finalizedHouses.filter((h) => h.phase === 'L3').reduce((s, h) => s + Math.abs(h.telemetry.netPowerKw), 0)

  const updatedTransformer: DomesticTransformer = {
    ...baseTransformer,
    currentLoadKw: txLoadKw,
    currentLoadKva: txLoadKva,
    loadingPercent: txLoadingPercent,
    flowDirection: netGridKw > 0 ? 'reverse_export_to_grid' : 'import_from_grid',
    tapPosition: tapPos,
    tapRatioPercent: tapRatio,
    phaseLoadingL1Percent: +((netL1Kw / 33.3) * 100).toFixed(1),
    phaseLoadingL2Percent: +((netL2Kw / 33.3) * 100).toFixed(1),
    phaseLoadingL3Percent: +((netL3Kw / 33.3) * 100).toFixed(1),
    voltageUnbalanceFactorPercent: Math.max(...finalizedHouses.map((h) => h.telemetry.voltageUnbalanceFactorPercent)),
    status: txLoadingPercent > 100 ? 'critical' : txLoadingPercent > 80 ? 'warning' : 'normal',
  }

  // 6. Updated Street Segments
  const updatedSegments: StreetSegment[] = baseSegments.map((seg, idx) => {
    let downstreamKw = 0
    for (let k = idx; k < finalizedHouses.length; k++) {
      downstreamKw += Math.abs(finalizedHouses[k].telemetry.netPowerKw)
    }
    const currentAmps = +((downstreamKw * 1000.0) / 230.0).toFixed(1)
    const cableAmpacity = seg.cableType.includes('70mm²') ? 210 : 150
    const loadingPercent = +((currentAmps / cableAmpacity) * 100.0).toFixed(1)

    return {
      ...seg,
      currentAmps,
      loadingPercent,
      status: loadingPercent > 100 ? 'critical' : loadingPercent > 80 ? 'warning' : 'normal',
    }
  })

  // Aggregates
  const voltages = finalizedHouses.map((h) => h.telemetry.voltageV)
  const peakV = Math.max(...voltages)
  const lowV = Math.min(...voltages)
  const avgV = +(voltages.reduce((a, b) => a + b, 0) / voltages.length).toFixed(1)
  const overVCount = finalizedHouses.filter((h) => h.telemetry.voltageV > 253.0).length
  const underVCount = finalizedHouses.filter((h) => h.telemetry.voltageV < 216.0).length
  const maxVuf = Math.max(...finalizedHouses.map((h) => h.telemetry.voltageUnbalanceFactorPercent))

  const totalBatStorage = finalizedHouses.reduce((acc, h) => acc + (h.battery?.capacityKwh || 0), 0)
  const batsWithSoc = finalizedHouses.filter((h) => h.battery)
  const avgSoc = batsWithSoc.length > 0
    ? Math.round(batsWithSoc.reduce((acc, h) => acc + (h.battery?.currentSocPercent || 0), 0) / batsWithSoc.length)
    : 0

  const p2pTotal = +finalizedHouses.reduce((acc, h) => acc + h.telemetry.p2pSharedKw, 0).toFixed(2)

  const selfConsRate = totalGen > 0
    ? Math.min(100, Math.round(((totalGen - Math.max(0, netGridKw)) / totalGen) * 100))
    : 0

  const totalLosses = +(finalizedHouses.reduce((acc, h) => acc + h.telemetry.lineLossesKw, 0)).toFixed(2)

  return {
    transformer: updatedTransformer,
    houses: finalizedHouses,
    segments: updatedSegments,
    timestamp: timeStr,
    totalGenerationKw: totalGen,
    totalLoadKw: totalLoad,
    netGridExchangeKw: netGridKw,
    peakVoltageV: peakV,
    lowestVoltageV: lowV,
    averageVoltageV: avgV,
    overVoltageHousesCount: overVCount,
    underVoltageHousesCount: underVCount,
    phaseUnbalanceMaxPercent: maxVuf,
    selfConsumptionRatePercent: selfConsRate,
    totalStorageKwh: totalBatStorage,
    averageBatterySocPercent: avgSoc,
    p2pEnergyExchangedKw: p2pTotal,
    totalLineLossesKw: totalLosses,
    violations,
  }
}

/**
 * Generate 24-hour time series curve for charts and slider
 */
export function generateDomestic24hProfile(
  preset: DomesticPreset = 'SUNNY_NOON_EXPORT',
  controlAction: DomesticControlAction = 'NONE'
): DomesticTimeSeriesPoint[] {
  const points: DomesticTimeSeriesPoint[] = []

  for (let hour = 6; hour <= 24; hour += 1) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`
    const net = calculateDomesticPowerFlow(timeStr, preset, controlAction)

    points.push({
      time: timeStr,
      solarGenerationKw: net.totalGenerationKw,
      householdLoadKw: net.totalLoadKw,
      gridExchangeKw: net.netGridExchangeKw,
      maxVoltageV: net.peakVoltageV,
      minVoltageV: net.lowestVoltageV,
      batterySocPercent: net.averageBatterySocPercent,
      transformerLoadingPercent: net.transformer.loadingPercent,
      voltageUnbalancePercent: net.phaseUnbalanceMaxPercent,
    })
  }

  return points
}
