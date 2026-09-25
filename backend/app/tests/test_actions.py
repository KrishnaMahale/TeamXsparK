import pytest
from app.engine.actions import ActionEngine
from app.services.action_service import ActionService
from app.schemas.battery import BatteryStorageConfig


def test_action_evaluation_and_feasibility():
    b_config = BatteryStorageConfig(initialSocPercent=62.0)
    actions, rec_id, comp = ActionEngine.evaluate_candidate_actions(
        peak_solar_kw=240.0,
        peak_load_kw=120.0,
        battery_config=b_config,
    )
    assert len(actions) == 4
    assert rec_id == "ACT-02"

    act_02 = next(a for a in actions if a.id == "ACT-02")
    assert act_02.isFeasible is True
    assert act_02.expectedVoltagePu <= 1.05

    act_04 = next(a for a in actions if a.id == "ACT-04")
    assert act_04.isFeasible is False
    assert act_04.infeasibleReason is not None


@pytest.mark.asyncio
async def test_action_execution_service():
    service = ActionService()
    res = await service.execute_action("ACT-02")
    assert res.success is True
    assert res.beforeState.b3Voltage > 1.05
    assert res.afterState.b3Voltage <= 1.05
    assert res.afterState.isSafe is True
