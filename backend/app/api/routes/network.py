from typing import Optional
from fastapi import APIRouter, Depends
from app.schemas.network import GridNetwork, Bus, Feeder
from app.db.repositories.network_repository import NetworkRepository
from app.core.exceptions import ResourceNotFoundException

router = APIRouter(tags=["Networks"])


def get_network_repo():
    return NetworkRepository()


# 1. Frontend gridService routes:
@router.get("/grid/network", response_model=GridNetwork)
async def get_grid_network(repo: NetworkRepository = Depends(get_network_repo)):
    return await repo.get_network()


@router.get("/grid/buses/{bus_id}", response_model=Bus)
async def get_grid_bus(bus_id: str, repo: NetworkRepository = Depends(get_network_repo)):
    bus = await repo.get_bus(bus_id)
    if not bus:
        raise ResourceNotFoundException("Bus", bus_id)
    return bus


@router.get("/grid/feeders/{feeder_id}", response_model=Feeder)
async def get_grid_feeder(feeder_id: str, repo: NetworkRepository = Depends(get_network_repo)):
    feeder = await repo.get_feeder(feeder_id)
    if not feeder:
        raise ResourceNotFoundException("Feeder", feeder_id)
    return feeder


# 2. Standard REST networks routes:
@router.get("/networks/{network_id}", response_model=GridNetwork)
async def get_network_by_id(network_id: str, repo: NetworkRepository = Depends(get_network_repo)):
    return await repo.get_network()


@router.get("/networks/{network_id}/topology")
async def get_network_topology(network_id: str, repo: NetworkRepository = Depends(get_network_repo)):
    net = await repo.get_network()
    return {
        "network_id": network_id,
        "buses": net.buses,
        "feeders": net.feeders,
        "transformers": [net.substation],
        "solar": net.solarUnits,
        "battery": net.batteries,
        "loads": net.loads,
    }
