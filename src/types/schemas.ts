import { z } from 'zod'

export const ComponentStatusSchema = z.enum(['normal', 'warning', 'critical'])

export const BusSchema = z.object({
  id: z.string(),
  name: z.string(),
  voltage: z.number(),
  voltageLimitMin: z.number(),
  voltageLimitMax: z.number(),
  loadKw: z.number(),
  solarKw: z.number(),
  lineLoadingPercent: z.number(),
  temperatureC: z.number(),
  status: ComponentStatusSchema,
  connectedFeeders: z.array(z.string()),
  connectedAssets: z.object({
    solar: z.string().optional(),
    battery: z.string().optional(),
    load: z.string().optional(),
  }),
})

export const FeederSchema = z.object({
  id: z.string(),
  name: z.string(),
  fromBus: z.string(),
  toBus: z.string(),
  loadingPercent: z.number(),
  loadingLimitPercent: z.number(),
  capacityKw: z.number(),
  activePowerKw: z.number(),
  reactivePowerKvar: z.number(),
  status: ComponentStatusSchema,
  isSwitchClosed: z.boolean(),
  isReconfigurableAlternate: z.boolean().optional(),
})

export const SolarUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  busId: z.string(),
  generationKw: z.number(),
  capacityKw: z.number(),
  irradianceWm2: z.number(),
  curtailedKw: z.number(),
  status: ComponentStatusSchema,
})

export const BatterySchema = z.object({
  id: z.string(),
  name: z.string(),
  busId: z.string(),
  powerKw: z.number(),
  maxDischargeKw: z.number(),
  maxChargeKw: z.number(),
  socPercent: z.number(),
  capacityKwh: z.number(),
  status: ComponentStatusSchema,
  cycleCount: z.number(),
})

export const LoadSchema = z.object({
  id: z.string(),
  name: z.string(),
  busId: z.string(),
  powerKw: z.number(),
  powerFactor: z.number(),
  status: ComponentStatusSchema,
})

export const TransformerSchema = z.object({
  id: z.string(),
  name: z.string(),
  ratingKva: z.number(),
  primaryVoltageKv: z.number(),
  secondaryVoltageKv: z.number(),
  loadingPercent: z.number(),
  temperatureC: z.number(),
  status: ComponentStatusSchema,
})

export const GridViolationSchema = z.object({
  id: z.string(),
  time: z.string(),
  componentType: z.enum(['bus', 'feeder', 'transformer']),
  componentId: z.string(),
  componentName: z.string(),
  issue: z.string(),
  type: z.string(),
  value: z.number(),
  unit: z.string(),
  formattedValue: z.string(),
  limit: z.number(),
  formattedLimit: z.string(),
  severity: z.enum(['critical', 'warning', 'resolved']),
  status: z.enum(['active', 'resolved']),
  recommendationHint: z.string().optional(),
})

export const ForecastDataPointSchema = z.object({
  time: z.string(),
  solarGenerationKw: z.number(),
  loadDemandKw: z.number(),
  predictedSolarKw: z.number(),
  predictedLoadKw: z.number(),
  netPowerKw: z.number(),
  confidenceLowerKw: z.number().optional(),
  confidenceUpperKw: z.number().optional(),
})

export const CorrectiveActionSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  parameterDelta: z.string(),
  durationMinutes: z.number().optional(),
  isFeasible: z.boolean(),
  infeasibleReason: z.string().optional(),
  expectedVoltagePu: z.number(),
  expectedFeederLoadPercent: z.number(),
  solarUsedKw: z.number(),
  batterySocPercent: z.number(),
  resolvedViolationsCount: z.number(),
  remainingViolationsCount: z.number(),
  renewableUtilizationPercent: z.number(),
})
