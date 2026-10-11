import { useMemo, useState, useEffect } from 'react'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
import { ViolationSeverity, GridViolation, ViolationSummary } from '../types/violation'

export type ViolationViewScope = 'worst_timestep' | 'full_horizon'
export type OperatingStateMode = 'baseline' | 'post_dispatch'

export const useViolations = () => {
  const {
    network,
    violations: gridViolations,
    violationSummary: gridSummary,
    activeActionApplied,
    selectBusById,
    selectFeederById,
    fetchNetwork,
  } = useGridStore()
  const { fullResult, comparisonData, executionResult, selectedAction } = useSimulationStore()

  const [viewScope, setViewScope] = useState<ViolationViewScope>('worst_timestep')
  const [operatingStateMode, setOperatingStateMode] = useState<OperatingStateMode>('baseline')
  const [severityFilter, setSeverityFilter] = useState<'all' | ViolationSeverity>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [componentFilter, setComponentFilter] = useState<string>('all')

  useEffect(() => {
    fetchNetwork()
  }, [fetchNetwork])

  // Has a corrective action been executed or applied?
  const hasDispatchedAction = Boolean(
    executionResult ||
    activeActionApplied ||
    (selectedAction && selectedAction.remainingViolationsCount !== undefined && selectedAction.isFeasible)
  )

  const activeActionTitle =
    executionResult?.actionId
      ? (selectedAction?.title || executionResult.actionId)
      : (activeActionApplied?.title || selectedAction?.title || 'Corrective Action')

  // Determine worst operating timestep
  const isSimMatchingGrid = fullResult && (!fullResult.input?.gridId || fullResult.input.gridId === network.id)
  const worstTime = (isSimMatchingGrid && fullResult?.summary?.simulationTime)
    ? fullResult.summary.simulationTime
    : '13:15'

  // Baseline violations at the worst operating timestep (authoritative contract with Actions page)
  const worstTimestepViolations = useMemo<GridViolation[]>(() => {
    if (isSimMatchingGrid && fullResult?.timeStepResults?.[worstTime]?.violations) {
      return fullResult.timeStepResults[worstTime].violations.map((v) => ({
        ...v,
        status: 'active' as const,
      }))
    }
    if (gridViolations.length > 0) {
      return gridViolations.map((v) => ({
        ...v,
        status: 'active' as const,
      }))
    }
    return []
  }, [isSimMatchingGrid, fullResult, worstTime, gridViolations])

  // Full-horizon violations across all 96 timesteps
  const fullHorizonViolations = useMemo<GridViolation[]>(() => {
    if (isSimMatchingGrid && fullResult?.timeStepResults) {
      const allList: GridViolation[] = []
      Object.entries(fullResult.timeStepResults).forEach(([_, stepRes]) => {
        if (stepRes.violations && stepRes.violations.length > 0) {
          allList.push(...stepRes.violations.map((v) => ({ ...v, status: 'active' as const })))
        }
      })
      if (allList.length > 0) {
        return allList
      }
    }
    return worstTimestepViolations
  }, [isSimMatchingGrid, fullResult, worstTimestepViolations])

  // Active violations list based on selected view scope (Baseline reference)
  const scopedBaselineViolations = viewScope === 'worst_timestep' ? worstTimestepViolations : fullHorizonViolations

  // Post-dispatch violations evaluated against the executed action or current grid state
  const postDispatchViolations = useMemo<GridViolation[]>(() => {
    if (!hasDispatchedAction) {
      return scopedBaselineViolations
    }

    const afterState = executionResult?.afterState
    const targetAction = activeActionApplied || selectedAction

    return scopedBaselineViolations.map((v) => {
      // 1. If backend afterState.violations is available:
      if (afterState?.violations && Array.isArray(afterState.violations)) {
        const stillBreached = afterState.violations.some(
          (av) => av.componentId === v.componentId && av.type === v.type
        )
        if (stillBreached) {
          const matched = afterState.violations.find((av) => av.componentId === v.componentId)
          return {
            ...v,
            value: matched ? matched.value : v.value,
            formattedValue: matched ? matched.formattedValue : v.formattedValue,
            status: 'active' as const,
          }
        } else {
          return {
            ...v,
            status: 'resolved' as const,
            severity: 'resolved' as const,
          }
        }
      }

      // 2. Physical evaluation against monitored component telemetry
      if (v.componentType === 'bus') {
        const afterV = afterState?.b3Voltage ?? targetAction?.expectedVoltagePu
        if (afterV !== undefined && afterV <= 1.05 && afterV >= 0.95) {
          return {
            ...v,
            value: afterV,
            formattedValue: `${afterV.toFixed(3)} pu`,
            status: 'resolved' as const,
            severity: 'resolved' as const,
          }
        } else if (afterV !== undefined) {
          return {
            ...v,
            value: afterV,
            formattedValue: `${afterV.toFixed(3)} pu`,
            status: 'active' as const,
          }
        }
      } else if (v.componentType === 'feeder') {
        const afterF = afterState?.f02LoadingPercent ?? targetAction?.expectedFeederLoadPercent
        if (afterF !== undefined && afterF <= 100) {
          return {
            ...v,
            value: afterF,
            formattedValue: `${afterF.toFixed(0)}%`,
            status: 'resolved' as const,
            severity: 'resolved' as const,
          }
        } else if (afterF !== undefined) {
          return {
            ...v,
            value: afterF,
            formattedValue: `${afterF.toFixed(0)}%`,
            status: 'active' as const,
          }
        }
      }

      // 3. Fallback to grid store live violation status if reconciled
      const matchedGridV = gridViolations.find((gv) => gv.id === v.id || gv.componentId === v.componentId)
      if (matchedGridV && matchedGridV.status === 'resolved') {
        return {
          ...v,
          status: 'resolved' as const,
          severity: 'resolved' as const,
        }
      }

      return v
    })
  }, [hasDispatchedAction, executionResult, activeActionApplied, selectedAction, scopedBaselineViolations, gridViolations])

  // Select violations list based on Operating State Mode (Baseline vs Post-Dispatch)
  const scopedViolations = operatingStateMode === 'post_dispatch' && hasDispatchedAction
    ? postDispatchViolations
    : scopedBaselineViolations

  const filteredViolations = useMemo(() => {
    return scopedViolations.filter((v) => {
      if (severityFilter !== 'all' && v.severity !== severityFilter) return false
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (componentFilter !== 'all' && v.componentId !== componentFilter) return false
      return true
    })
  }, [scopedViolations, severityFilter, statusFilter, componentFilter])

  // Canonical summary counts: strictly derived from the evaluated operating state
  const summary = useMemo<ViolationSummary>(() => {
    const activeViols = scopedViolations.filter((v) => v.status === 'active')
    const critical = activeViols.filter((v) => v.severity === 'critical').length
    const warning = activeViols.filter((v) => v.severity === 'warning').length
    const resolved = scopedViolations.filter((v) => v.status === 'resolved').length

    return {
      critical,
      warning,
      resolved,
      total: critical + warning,
      hasViolations: critical + warning > 0,
    }
  }, [scopedViolations])

  const handleSelectViolation = (violation: GridViolation) => {
    if (violation.componentType === 'bus') {
      selectBusById(violation.componentId)
    } else if (violation.componentType === 'feeder') {
      selectFeederById(violation.componentId)
    }
  }

  return {
    violations: filteredViolations,
    allViolations: scopedViolations,
    worstTimestepViolations,
    fullHorizonViolations,
    summary,
    viewScope,
    setViewScope,
    operatingStateMode,
    setOperatingStateMode,
    hasDispatchedAction,
    activeActionTitle,
    worstTime,
    hasFullSimulation: Boolean(isSimMatchingGrid && fullResult?.timeStepResults),
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    componentFilter,
    setComponentFilter,
    handleSelectViolation,
  }
}
