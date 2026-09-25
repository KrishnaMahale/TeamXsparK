from app.engine.power_flow import PowerFlowEngine


def test_normal_power_flow():
    engine = PowerFlowEngine(is_alternative_topology=False)
    buses, feeders, losses, tx_loading = engine.solve(
        solar_kw=80.0,
        load_kw=100.0,
        installed_solar_capacity_kw=250.0
    )
    v_b3 = next(b.voltage for b in buses if b.id == "B3")
    f_02 = next(f.loadingPercent for f in feeders if f.id == "F-02")

    assert 0.95 <= v_b3 <= 1.05
    assert f_02 <= 100.0


def test_high_solar_power_flow_voltage_rise():
    engine = PowerFlowEngine(is_alternative_topology=False)
    buses, feeders, losses, tx_loading = engine.solve(
        solar_kw=240.0,
        load_kw=120.0,
        installed_solar_capacity_kw=250.0
    )
    v_b3 = next(b.voltage for b in buses if b.id == "B3")
    f_02 = next(f.loadingPercent for f in feeders if f.id == "F-02")

    # B3 voltage should rise beyond statutory 1.05 pu
    assert v_b3 > 1.05
    # Feeder F-02 loading should exceed 100%
    assert f_02 > 100.0


def test_alternative_topology_reconfiguration_relief():
    engine = PowerFlowEngine(is_alternative_topology=True)
    buses, feeders, losses, tx_loading = engine.solve(
        solar_kw=240.0,
        load_kw=120.0,
        installed_solar_capacity_kw=250.0
    )
    v_b3 = next(b.voltage for b in buses if b.id == "B3")
    f_02 = next(f.loadingPercent for f in feeders if f.id == "F-02")
    f_03 = next(f.loadingPercent for f in feeders if f.id == "F-03")

    # Alternative topology should mitigate voltage rise and relieve F-02
    assert v_b3 <= 1.05
    assert f_02 < 100.0
    assert f_03 > 0.0 # Tie line energized
