-- 001_initial_schema.sql
-- TeamXsparK Renewable Distribution Grid Digital Twin
-- Supabase PostgreSQL Relational Schema with Row Level Security (RLS)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked with Supabase auth.users if available)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Scenarios Table
CREATE TABLE IF NOT EXISTS public.scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    scenario_type TEXT NOT NULL DEFAULT 'CUSTOM',
    start_time TEXT DEFAULT '06:00',
    end_time TEXT DEFAULT '24:00',
    resolution_minutes INT DEFAULT 60,
    solar_capacity_kw NUMERIC(10, 2) DEFAULT 250.00,
    network_config JSONB DEFAULT '{}'::jsonb,
    battery_config JSONB DEFAULT '{}'::jsonb,
    created_by TEXT DEFAULT 'demo-user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_type ON public.scenarios(scenario_type);

-- 3. Time Series Data Table
CREATE TABLE IF NOT EXISTS public.time_series_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id TEXT NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
    "timestamp" TEXT NOT NULL,
    solar_generation_kw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    load_demand_kw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_scenario_timestamp UNIQUE (scenario_id, "timestamp")
);

CREATE INDEX IF NOT EXISTS idx_timeseries_scenario_time ON public.time_series_data(scenario_id, "timestamp");

-- 4. Networks Table
CREATE TABLE IF NOT EXISTS public.networks (
    id TEXT PRIMARY KEY DEFAULT 'DEFAULT_GRID',
    scenario_id TEXT REFERENCES public.scenarios(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'Distribution Grid Network',
    topology JSONB NOT NULL DEFAULT '{}'::jsonb,
    voltage_min_pu NUMERIC(4, 3) DEFAULT 0.950,
    voltage_max_pu NUMERIC(4, 3) DEFAULT 1.050,
    feeder_loading_limit_pct NUMERIC(5, 2) DEFAULT 100.00,
    transformer_loading_limit_pct NUMERIC(5, 2) DEFAULT 100.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Batteries Table
CREATE TABLE IF NOT EXISTS public.batteries (
    id TEXT PRIMARY KEY DEFAULT 'BAT-01',
    scenario_id TEXT REFERENCES public.scenarios(id) ON DELETE CASCADE,
    capacity_kwh NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    initial_soc_pct NUMERIC(5, 2) NOT NULL DEFAULT 62.00,
    min_soc_pct NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    max_soc_pct NUMERIC(5, 2) NOT NULL DEFAULT 95.00,
    max_charge_kw NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
    max_discharge_kw NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
    efficiency NUMERIC(4, 3) NOT NULL DEFAULT 0.920,
    location_bus_id TEXT NOT NULL DEFAULT 'B3'
);

-- 6. Simulations Table
CREATE TABLE IF NOT EXISTS public.simulations (
    id TEXT PRIMARY KEY,
    scenario_id TEXT REFERENCES public.scenarios(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'IDLE', -- IDLE, PREPARING, RUNNING, COMPLETE, FAILED
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    "current_time" TEXT,
    error_message TEXT,
    input_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulations_status ON public.simulations(status);

-- 7. Simulation Results (Timestep results)
CREATE TABLE IF NOT EXISTS public.simulation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id TEXT NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
    "timestamp" TEXT NOT NULL,
    solar_generation_kw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    load_demand_kw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_power_kw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bus_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    feeder_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    transformer_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    battery_soc_pct NUMERIC(5, 2) DEFAULT 60.00,
    violation_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sim_timestamp UNIQUE (simulation_id, "timestamp")
);

CREATE INDEX IF NOT EXISTS idx_sim_results_sim_time ON public.simulation_results(simulation_id, "timestamp");

-- 8. Violations Table
CREATE TABLE IF NOT EXISTS public.violations (
    id TEXT PRIMARY KEY,
    simulation_id TEXT NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
    "timestamp" TEXT NOT NULL,
    component_type TEXT NOT NULL, -- bus, feeder, transformer
    component_id TEXT NOT NULL,
    violation_type TEXT NOT NULL, -- over_voltage, under_voltage, feeder_overload, etc.
    actual_value NUMERIC(10, 3) NOT NULL,
    limit_value NUMERIC(10, 3) NOT NULL,
    severity TEXT NOT NULL, -- warning, critical
    message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_sim_time ON public.violations(simulation_id, "timestamp");

-- 9. Actions Table
CREATE TABLE IF NOT EXISTS public.actions (
    id TEXT PRIMARY KEY,
    simulation_id TEXT REFERENCES public.simulations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    parameter_delta TEXT,
    parameters JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'AVAILABLE',
    feasible BOOLEAN DEFAULT TRUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Action Results Table
CREATE TABLE IF NOT EXISTS public.action_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id TEXT NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
    before_state JSONB NOT NULL,
    after_state JSONB NOT NULL,
    renewable_utilization_before NUMERIC(5, 2) DEFAULT 100.00,
    renewable_utilization_after NUMERIC(5, 2) DEFAULT 100.00,
    violations_before INT DEFAULT 0,
    violations_after INT DEFAULT 0,
    violations_resolved INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_series_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_results ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for demo/hackathon scenarios (idempotent policies)
DROP POLICY IF EXISTS "Public full access to scenarios" ON public.scenarios;
CREATE POLICY "Public full access to scenarios" ON public.scenarios FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access to time_series_data" ON public.time_series_data;
CREATE POLICY "Public full access to time_series_data" ON public.time_series_data FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access to networks" ON public.networks;
CREATE POLICY "Public full access to networks" ON public.networks FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access to batteries" ON public.batteries;
CREATE POLICY "Public full access to batteries" ON public.batteries FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access to simulations" ON public.simulations;
CREATE POLICY "Public full access to simulations" ON public.simulations FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access to simulation_results" ON public.simulation_results;
CREATE POLICY "Public full access to simulation_results" ON public.simulation_results FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access to violations" ON public.violations;
CREATE POLICY "Public full access to violations" ON public.violations FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access to actions" ON public.actions;
CREATE POLICY "Public full access to actions" ON public.actions FOR ALL USING (true);

DROP POLICY IF EXISTS "Public full access to action_results" ON public.action_results;
CREATE POLICY "Public full access to action_results" ON public.action_results FOR ALL USING (true);
