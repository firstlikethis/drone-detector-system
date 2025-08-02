"""
API routes for system management and configuration
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Body
from pydantic import BaseModel, Field

from app.main import drone_simulator  # Import the global simulator instance

router = APIRouter()

class SimulatorConfig(BaseModel):
    """Simulator configuration settings"""
    num_drones: Optional[int] = Field(None, ge=0, le=20, description="Number of drones to simulate")
    update_interval: Optional[float] = Field(None, ge=0.1, le=10.0, description="Update interval in seconds")
    border_center_lat: Optional[float] = Field(None, ge=-90, le=90, description="Border center latitude")
    border_center_lon: Optional[float] = Field(None, ge=-180, le=180, description="Border center longitude")
    border_width: Optional[float] = Field(None, gt=0, description="Border width in degrees")
    border_height: Optional[float] = Field(None, gt=0, description="Border height in degrees")
    border_rotation: Optional[float] = Field(None, description="Border rotation in degrees")

@router.get("/system/status", response_model=Dict[str, Any])
async def get_system_status():
    """
    Get current system status
    """
    # In a real system, you would check hardware status, network connectivity, etc.
    # For now, we'll just return simulator status
    
    return {
        "status": "online",
        "simulator": {
            "active": True,
            "num_drones": len(drone_simulator.drones),
            "update_interval": drone_simulator.update_interval,
            "border": drone_simulator.border
        },
        "system": {
            "version": "0.1.0",
            "uptime": "N/A",  # Would be calculated in a real system
            "cpu_usage": "N/A",  # Would be calculated in a real system
            "memory_usage": "N/A"  # Would be calculated in a real system
        }
    }

@router.post("/system/simulator/config", response_model=Dict[str, Any])
async def update_simulator_config(config: SimulatorConfig):
    """
    Update simulator configuration settings
    """
    updates = {}
    
    # Update number of drones if specified
    if config.num_drones is not None:
        drone_simulator.num_drones = config.num_drones
        updates["num_drones"] = config.num_drones
    
    # Update update interval if specified
    if config.update_interval is not None:
        drone_simulator.update_interval = config.update_interval
        updates["update_interval"] = config.update_interval
    
    # Update border settings if specified
    border_updated = False
    
    # Update border center if both lat and lon are specified
    if config.border_center_lat is not None and config.border_center_lon is not None:
        drone_simulator.border["center"] = {
            "latitude": config.border_center_lat,
            "longitude": config.border_center_lon
        }
        border_updated = True
    
    # Update border width if specified
    if config.border_width is not None:
        drone_simulator.border["width"] = config.border_width
        border_updated = True
    
    # Update border height if specified
    if config.border_height is not None:
        drone_simulator.border["height"] = config.border_height
        border_updated = True
    
    # Update border rotation if specified
    if config.border_rotation is not None:
        drone_simulator.border["rotation"] = config.border_rotation
        border_updated = True
    
    if border_updated:
        updates["border"] = drone_simulator.border
    
    return {
        "status": "success",
        "message": "Simulator configuration updated",
        "updates": updates
    }

@router.post("/system/simulator/reset", response_model=Dict[str, Any])
async def reset_simulator():
    """
    Reset the simulator (clear all drones and alerts)
    """
    # Clear all drones
    drone_simulator.drones.clear()
    
    # Clear all alerts
    drone_simulator.alerts.clear()
    
    return {
        "status": "success",
        "message": "Simulator reset successfully"
    }

@router.post("/system/simulator/add_drone", response_model=Dict[str, Any])
async def add_test_drone():
    """
    Add a test drone to the simulation
    """
    # Create a new random drone
    new_drone = drone_simulator._create_random_drone()
    
    # Add to simulator
    drone_simulator.drones[new_drone.id] = new_drone
    
    return {
        "status": "success",
        "message": f"Test drone added with ID {new_drone.id}",
        "drone": new_drone.to_dict()
    }