import { useMemo, useState } from 'react'
import { useGridStore } from '../store/gridStore'
import { ViolationSeverity, GridViolation } from '../types/violation'

export const useViolations = () => {
  const { violations, violationSummary, selectBusById, selectFeederById } = useGridStore()
  const [severityFilter, setSeverityFilter] = useState<'all' | ViolationSeverity>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [componentFilter, setComponentFilter] = useState<string>('all')

  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      if (severityFilter !== 'all' && v.severity !== severityFilter) return false
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (componentFilter !== 'all' && v.componentId !== componentFilter) return false
      return true
    })
  }, [violations, severityFilter, statusFilter, componentFilter])

  const handleSelectViolation = (violation: GridViolation) => {
    if (violation.componentType === 'bus') {
      selectBusById(violation.componentId)
    } else if (violation.componentType === 'feeder') {
      selectFeederById(violation.componentId)
    }
  }

  return {
    violations: filteredViolations,
    allViolations: violations,
    summary: violationSummary,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    componentFilter,
    setComponentFilter,
    handleSelectViolation,
  }
}
