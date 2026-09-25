import datetime
from app.schemas.report import GridReportSummary, ReportExportData
from app.db.repositories.network_repository import NetworkRepository


class ReportService:
    def __init__(self):
        self.net_repo = NetworkRepository()

    async def generate_report(self, scenario_name: str = "High Solar", simulation_time: str = "13:15") -> GridReportSummary:
        now_str = datetime.datetime.now().isoformat()
        is_normal = "Normal" in scenario_name
        is_infeasible = "Infeasible" in scenario_name or "Extreme" in scenario_name

        init_viols = 0 if is_normal else (3 if is_infeasible else 2)
        fin_viols = 0 if not is_infeasible else 2
        utilization = 100.0 if not is_infeasible else 96.0

        return GridReportSummary(
            scenarioName=scenario_name,
            simulationTime=simulation_time,
            initialViolations=init_viols,
            finalViolations=fin_viols,
            renewableUtilizationPercent=utilization,
            recommendedAction="Feeder Reconfiguration (F-02 → F-03)" if not is_normal else "None",
            peakSolarKw=240.0,
            peakLoadKw=150.0,
            curtailedEnergyKwh=0.0,
            batteryThroughputKwh=24.5,
            gridLossPercent=3.2,
            voltageStabilityIndex=0.98,
            generatedAt=now_str,
        )

    async def get_report_export(self, simulation_id: str) -> ReportExportData:
        summary = await self.generate_report("High Solar", "13:15")
        net = await self.net_repo.get_network()

        return ReportExportData(
            reportId=f"REP-{simulation_id}",
            timestamp=datetime.datetime.now().isoformat(),
            summary=summary,
            buses=[{"id": b.id, "name": b.name, "voltage": b.voltage, "status": b.status.value} for b in net.buses],
            feeders=[{"id": f.id, "name": f.name, "loadingPercent": f.loadingPercent, "status": f.status.value} for f in net.feeders],
            violations=[],
        )
