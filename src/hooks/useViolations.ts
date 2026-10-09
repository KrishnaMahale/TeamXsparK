import { useMemo, useState, useEffect } from 'react'
import { useGridStore } from '../store/gridStore'
import { useSimulationStore } from '../store/simulationStore'
import { ViolationSeverity, GridViolation, ViolationSummary } from '../types/violation'

export type ViolationViewScope = 'worst_timestep' | 'full_horizon'

export const useViolations = () => {
  const { network, violations: gridViolations, violationSummary: gridSummary, selectBusById, selectFeederById, fetchNetwork } = useGridStore()
  const { fullResult, comparisonData, executionResult } = useSimulationStore()

  const [viewScope, setViewScope] = useState<ViolationViewScope>('worst_timestep')
  const [severityFilter, setSeverityFilter] = useState<'all' | ViolationSeverity>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [componentFilter, setComponentFilter] = useState<string>('all')

  useEffect(() => {
    fetchNetwork()
  }, [fetchNetwork])

  // Determine worst operating timestep
  const isSimMatchingGrid = fullResult && (!fullResult.input?.gridId || fullResult.input.gridId === network.id)
  const worstTime = (isSimMatchingGrid && fullResult?.summary?.simulationTime)
    ? fullResult.summary.simulationTime
    : '13:15'

  // Baseline violations at the worst operating timestep (authoritative contract with Actions page)
  const worstTimestepViolations = useMemo<GridViolation[]>(() => {
    if (isSimMatchingGrid && fullResult?.timeStepResults?.[worstTime]?.violations) {
      return fullResult.timeStepResults[worstTime].violations
    }
    if (gridViolations.length > 0) {
      return gridViolations
    }
    return []
  }, [isSimMatchingGrid, fullResult, worstTime, gridViolations])

  // Full-horizon violations across all 96 timesteps
  const fullHorizonViolations = useMemo<GridViolation[]>(() => {
    if (isSimMatchingGrid && fullResult?.timeStepResults) {
      const allList: GridViolation[] = []
      Object.entries(fullResult.timeStepResults).forEach(([_, stepRes]) => {
        if (stepRes.violations && stepRes.violations.length > 0) {
          allList.push(...stepRes.violations)
        }
      })
      if (allList.length > 0) {
        return allList
      }
    }
    return worstTimestepViolations
  }, [isSimMatchingGrid, fullResult, worstTimestepViolations])

  // Active violations list based on selected view scope
  const scopedViolations = viewScope === 'worst_timestep' ? worstTimestepViolations : fullHorizonViolations

  const filteredViolations = useMemo(() => {
    return scopedViolations.filter((v) => {
      if (severityFilter !== 'all' && v.severity !== severityFilter) return false
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (componentFilter !== 'all' && v.componentId !== componentFilter) return false
      return true
    })
  }, [scopedViolations, severityFilter, statusFilter, componentFilter])

  // Summary counts
  const summary = useMemo<ViolationSummary>(() => {
    const critical = scopedViolations.filter((v) => v.severity === 'critical').length
    const warning = scopedViolations.filter((v) => v.severity === 'warning').length
    const resolved = executionResult?.success
      ? Math.max(0, worstTimestepViolations.length - (executionResult.afterState?.violationsCount ?? 0))
      : 0
    return {
      critical,
      warning,
      resolved,
      total: critical + warning,
      hasViolations: critical + warning > 0,
    }
  }, [scopedViolations, worstTimestepViolations, executionResult])

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
