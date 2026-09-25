import asyncio
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.supabase import get_supabase_client
from app.db.repositories.scenario_repository import seed_memory_scenarios, _MEMORY_SCENARIOS
from app.db.repositories.network_repository import get_default_network
from app.core.logging import setup_logging, logger


async def seed():
    setup_logging()
    logger.info("Starting database seeding...")

    # Seed in-memory structures
    seed_memory_scenarios()
    default_network = get_default_network()

    supabase = get_supabase_client()
    if not supabase:
        logger.info("Supabase client not connected (running in local memory mode). All 5 demo scenarios and default grid seeded in memory.")
        return

    logger.info("Seeding data to Supabase PostgreSQL...")
    try:
        # 1. Seed Scenarios
        for s_id, s in _MEMORY_SCENARIOS.items():
            supabase.table("scenarios").upsert({
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "scenario_type": s.id,
                "solar_capacity_kw": s.solarKw,
                "start_time": "06:00",
                "end_time": "24:00",
                "resolution_minutes": 60,
            }).execute()
        logger.info(f"Seeded {len(_MEMORY_SCENARIOS)} scenarios to Supabase.")

        # 2. Seed Network
        supabase.table("networks").upsert({
            "id": "DEFAULT_GRID",
            "name": "TeamXsparK 4-Bus Feeder Network",
            "topology": {
                "buses": [b.model_dump() for b in default_network.buses],
                "feeders": [f.model_dump() for f in default_network.feeders],
            },
            "voltage_min_pu": 0.95,
            "voltage_max_pu": 1.05,
            "feeder_loading_limit_pct": 100.0,
            "transformer_loading_limit_pct": 100.0,
        }).execute()
        logger.info("Seeded default network topology to Supabase.")

        # 3. Seed Battery
        supabase.table("batteries").upsert({
            "id": "BAT-01",
            "capacity_kwh": 100.0,
            "initial_soc_pct": 62.0,
            "min_soc_pct": 20.0,
            "max_soc_pct": 95.0,
            "max_charge_kw": 40.0,
            "max_discharge_kw": 40.0,
            "efficiency": 0.92,
            "location_bus_id": "B3",
        }).execute()
        logger.info("Seeded battery configuration to Supabase.")

    except Exception as e:
        logger.error(f"Error seeding database: {e}")

    logger.info("Database seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
