from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Body
from app.schemas.network import GridNetwork, Bus, Feeder
from app.db.repositories.network_repository import NetworkRepository
from app.core.exceptions import ResourceNotFoundException

router = APIRouter(tags=["Networks"])


def get_network_repo():
    return NetworkRepository()


# Grid Management API

@router.get("/networks/grids", response_model=List[GridNetwork])
async def get_all_grids(repo: NetworkRepository = Depends(get_network_repo)):
    return await repo.get_all_grids()

@router.post("/networks/grids", response_model=GridNetwork)
async def create_grid(grid: GridNetwork = Body(...), repo: NetworkRepository = Depends(get_network_repo)):
    return await repo.create_grid(grid)

@router.get("/networks/grids/active", response_model=dict)
async def get_active_grid_id(repo: NetworkRepository = Depends(get_network_repo)):
    return {"active_grid_id": await repo.get_active_grid_id()}

@router.put("/networks/grids/active")
async def set_active_grid_id(grid_id: str = Body(..., embed=True), repo: NetworkRepository = Depends(get_network_repo)):
    success = await repo.set_active_grid_id(grid_id)
    if not success:
        raise HTTPException(status_code=404, detail="Grid not found")
    return {"status": "success", "active_grid_id": grid_id}

@router.get("/networks/grids/{grid_id}", response_model=GridNetwork)
async def get_grid_by_id(grid_id: str, repo: NetworkRepository = Depends(get_network_repo)):
    grid = await repo.get_grid(grid_id)
    if not grid:
        raise ResourceNotFoundException("GridNetwork", grid_id)
    return grid

@router.put("/networks/grids/{grid_id}", response_model=GridNetwork)
async def update_grid(grid_id: str, grid: GridNetwork = Body(...), repo: NetworkRepository = Depends(get_network_repo)):
    updated = await repo.update_grid(grid_id, grid)
    if not updated:
        raise ResourceNotFoundException("GridNetwork", grid_id)
    from app.services.simulation_service import invalidate_simulation_for_grid
    invalidate_simulation_for_grid(grid_id)
    return updated

@router.delete("/networks/grids/{grid_id}")
async def delete_grid(grid_id: str, repo: NetworkRepository = Depends(get_network_repo)):
    if grid_id == "default-grid":
        raise HTTPException(status_code=400, detail="Cannot delete default benchmark grid.")
    success = await repo.delete_grid(grid_id)
    if not success:
        raise ResourceNotFoundException("GridNetwork", grid_id)
    from app.services.simulation_service import invalidate_simulation_for_grid
    invalidate_simulation_for_grid(grid_id)
    return {"status": "success"}

# Legacy Frontend gridService routes:
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

@router.get("/networks/{network_id}/topology")
async def get_network_topology(network_id: str, repo: NetworkRepository = Depends(get_network_repo)):
    # Fallback legacy route used by some parts of the code
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
