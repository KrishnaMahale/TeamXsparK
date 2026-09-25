from fastapi import APIRouter, Depends
from app.schemas.report import GridReportSummary, ReportExportData, ReportGenerateRequest
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


def get_report_service():
    return ReportService()


@router.post("/generate", response_model=GridReportSummary)
async def generate_report(
    request: ReportGenerateRequest,
    service: ReportService = Depends(get_report_service),
):
    return await service.generate_report(request.scenarioName, request.simulationTime)


@router.get("/{simulation_id}", response_model=ReportExportData)
async def get_report_by_simulation(
    simulation_id: str,
    service: ReportService = Depends(get_report_service),
):
    return await service.get_report_export(simulation_id)
