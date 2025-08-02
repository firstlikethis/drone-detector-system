"""
API routes for drone countermeasures
"""
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body, status
from pydantic import BaseModel, Field
from enum import Enum

from app.countermeasures import jammer, takeover, physical
from app.countermeasures.jammer import JammerMode, JammerType
from app.countermeasures.takeover import TakeoverMethod, TakeoverCommand
from app.countermeasures.physical import CaptureMethod
from app.core.globals import drone_simulator

router = APIRouter()

# Pydantic models for API requests
class JammingRequest(BaseModel):
    """Request to activate jamming on specific frequencies"""
    drone_id: str
    frequencies: Optional[List[float]] = None
    duration: Optional[int] = Field(30, ge=1, le=300, description="Duration in seconds")
    power_level: int = Field(50, ge=1, le=100, description="Power level (1-100%)")
    jammer_type: Optional[str] = Field(None, description="Type of jammer to use")

class DroneJamRequest(BaseModel):
    """Request to jam a specific drone's control frequencies"""
    drone_id: str
    jam_gps: bool = Field(False, description="Whether to jam GPS in addition to control")
    duration: Optional[int] = Field(30, ge=1, le=300, description="Duration in seconds")
    power_level: int = Field(70, ge=1, le=100, description="Power level (1-100%)")

class TakeoverRequest(BaseModel):
    """Request to take over a drone"""
    drone_id: str
    method: str = Field(..., description="Takeover method to use")
    command: str = Field(..., description="Command to send to the drone")
    parameters: Optional[Dict[str, Any]] = None
    duration: Optional[int] = Field(None, ge=1, le=300, description="Duration in seconds")

class CaptureRequest(BaseModel):
    """Request to physically capture a drone"""
    drone_id: str
    method: str = Field(..., description="Capture method to use")
    parameters: Optional[Dict[str, Any]] = None

# Routes for RF Jamming
@router.post("/jam", response_model=Dict[str, Any])
async def activate_jamming(request: JammingRequest):
    """
    Activate RF jamming against a specific drone
    """
    # Check if drone exists
    if request.drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {request.drone_id} not found"
        )
    
    # Get drone data
    drone = drone_simulator.drones[request.drone_id]
    
    # Determine frequencies if not specified
    frequencies = request.frequencies
    if not frequencies:
        # Use default frequencies based on drone type
        if drone.type.value == "commercial":
            frequencies = [2.4e9, 5.8e9]  # 2.4 GHz and 5.8 GHz
        elif drone.type.value == "military":
            frequencies = [2.4e9, 5.8e9, 1.57542e9]  # Including GPS
        else:
            frequencies = [2.4e9]  # Default to 2.4 GHz
    
    # Set jammer type if specified
    if request.jammer_type:
        try:
            jammer_type = JammerType(request.jammer_type)
            jammer.set_jammer_type(jammer_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid jammer type: {request.jammer_type}"
            )
    
    # Activate jamming
    result = jammer.activate_jamming(
        frequency=frequencies,
        power_level=request.power_level,
        duration=request.duration,
        jammer_id=f"api_{request.drone_id}"
    )
    
    # Apply jamming effect to the drone in the simulator
    distance = 100  # Assume 100m distance for simulation
    updated_drone_data = jammer.simulate_jamming_effect(drone.dict(), distance)
    
    # Update drone in simulator
    for key, value in updated_drone_data.items():
        if hasattr(drone, key):
            setattr(drone, key, value)
    
    return {
        "status": "success",
        "message": f"Jamming activated against drone {request.drone_id}",
        "jamming_details": result,
        "drone": drone.to_dict()
    }

@router.post("/jam/drone", response_model=Dict[str, Any])
async def jam_drone_control(request: DroneJamRequest):
    """
    Jam a specific drone's control frequencies
    """
    # Check if drone exists
    if request.drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {request.drone_id} not found"
        )
    
    # Get drone data
    drone = drone_simulator.drones[request.drone_id]
    
    # Jam drone control frequencies
    result = jammer.jam_drone_control(
        drone_type=drone.type.value,
        power_level=request.power_level,
        duration=request.duration
    )
    
    # If GPS jamming is requested, also jam GPS
    gps_result = None
    if request.jam_gps:
        gps_result = jammer.jam_gps(
            power_level=request.power_level,
            duration=request.duration
        )
    
    # Apply jamming effect to the drone in the simulator
    distance = 100  # Assume 100m distance for simulation
    updated_drone_data = jammer.simulate_jamming_effect(drone.dict(), distance)
    
    # Update drone in simulator
    for key, value in updated_drone_data.items():
        if hasattr(drone, key):
            setattr(drone, key, value)
    
    return {
        "status": "success",
        "message": f"Jamming drone {request.drone_id} control frequencies",
        "jamming_details": result,
        "gps_jamming": gps_result,
        "drone": drone.to_dict()
    }

@router.delete("/jam/{jammer_id}", response_model=Dict[str, Any])
async def deactivate_jamming(jammer_id: str):
    """
    Deactivate a specific jammer
    """
    result = jammer.deactivate_jamming(jammer_id)
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    
    return {
        "status": "success",
        "message": f"Jammer {jammer_id} deactivated",
        "details": result
    }

@router.get("/jam/status", response_model=Dict[str, Any])
async def get_jammer_status():
    """
    Get status of all active jammers
    """
    return {
        "status": "success",
        "jammer_status": jammer.get_active_jammers()
    }

# Routes for Drone Takeover
@router.post("/takeover", response_model=Dict[str, Any])
async def takeover_drone(request: TakeoverRequest):
    """
    Attempt to take over control of a drone
    """
    # Check if drone exists
    if request.drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {request.drone_id} not found"
        )
    
    # Get drone data
    drone = drone_simulator.drones[request.drone_id]
    
    # Validate method and command
    try:
        method = TakeoverMethod(request.method)
        command = TakeoverCommand(request.command)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid method or command: {str(e)}"
        )
    
    # Attempt takeover
    result = takeover.takeover_drone(
        drone_id=request.drone_id,
        method=method,
        command=command,
        parameters=request.parameters,
        duration=request.duration
    )
    
    # Apply takeover effect to the drone in the simulator
    updated_drone_data = takeover.simulate_takeover_effect(drone.dict())
    
    # Update drone in simulator
    for key, value in updated_drone_data.items():
        if hasattr(drone, key):
            setattr(drone, key, value)
    
    return {
        "status": "success",
        "message": f"Takeover attempt initiated for drone {request.drone_id}",
        "takeover_details": result,
        "drone": drone.to_dict()
    }

@router.post("/takeover/land", response_model=Dict[str, Any])
async def force_drone_landing(drone_id: str):
    """
    Force a drone to land immediately
    """
    # Check if drone exists
    if drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {drone_id} not found"
        )
    
    # Get drone data
    drone = drone_simulator.drones[drone_id]
    
    # Force landing
    result = takeover.force_landing(drone_id)
    
    # Apply takeover effect to the drone in the simulator
    updated_drone_data = takeover.simulate_takeover_effect(drone.dict())
    
    # Update drone in simulator
    for key, value in updated_drone_data.items():
        if hasattr(drone, key):
            setattr(drone, key, value)
    
    return {
        "status": "success",
        "message": f"Force landing command sent to drone {drone_id}",
        "takeover_details": result,
        "drone": drone.to_dict()
    }

@router.delete("/takeover/{drone_id}", response_model=Dict[str, Any])
async def stop_takeover(drone_id: str):
    """
    Stop an active takeover attempt
    """
    result = takeover.stop_takeover(drone_id)
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    
    return {
        "status": "success",
        "message": f"Takeover stopped for drone {drone_id}",
        "details": result
    }

@router.get("/takeover/status", response_model=Dict[str, Any])
async def get_takeover_status():
    """
    Get status of all active takeover attempts
    """
    return {
        "status": "success",
        "takeover_status": takeover.get_active_takeovers()
    }

@router.get("/takeover/vulnerabilities/{drone_id}", response_model=Dict[str, Any])
async def check_drone_vulnerabilities(drone_id: str):
    """
    Analyze a drone for potential vulnerabilities
    """
    # Check if drone exists
    if drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {drone_id} not found"
        )
    
    # Get drone data
    drone = drone_simulator.drones[drone_id]
    
    # Detect vulnerabilities
    vulnerabilities = takeover.detect_vulnerabilities(drone.dict())
    
    return {
        "status": "success",
        "drone_id": drone_id,
        "vulnerabilities": vulnerabilities,
        "count": len(vulnerabilities)
    }

# Routes for Physical Countermeasures
@router.post("/physical/capture", response_model=Dict[str, Any])
async def capture_drone(request: CaptureRequest):
    """
    Deploy physical countermeasure to capture a drone
    """
    # Check if drone exists
    if request.drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {request.drone_id} not found"
        )
    
    # Get drone data
    drone = drone_simulator.drones[request.drone_id]
    
    # Validate method
    try:
        method = CaptureMethod(request.method)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid capture method: {str(e)}"
        )
    
    # Deploy countermeasure
    result = physical.deploy_countermeasure(
        drone_id=request.drone_id,
        method=method,
        parameters=request.parameters
    )
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    # Apply capture effect to the drone in the simulator
    updated_drone_data = physical.simulate_capture_effect(drone.dict())
    
    # Update drone in simulator
    for key, value in updated_drone_data.items():
        if hasattr(drone, key):
            setattr(drone, key, value)
    
    return {
        "status": "success",
        "message": f"Capture attempt initiated for drone {request.drone_id}",
        "operation_details": result,
        "drone": drone.to_dict()
    }

@router.delete("/physical/{operation_id}", response_model=Dict[str, Any])
async def abort_capture(operation_id: str):
    """
    Abort an active physical countermeasure operation
    """
    result = physical.abort_countermeasure(operation_id)
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    
    return {
        "status": "success",
        "message": f"Operation {operation_id} aborted",
        "details": result
    }

@router.get("/physical/equipment", response_model=Dict[str, Any])
async def get_equipment_status(method: Optional[str] = None):
    """
    Get status of physical countermeasure equipment
    """
    return physical.get_equipment_status(method)

@router.get("/physical/operations", response_model=Dict[str, Any])
async def get_operations_status():
    """
    Get status of all active physical countermeasure operations
    """
    return {
        "status": "success",
        "operations": physical.get_active_operations()
    }

@router.post("/physical/connect/{method}", response_model=Dict[str, Any])
async def connect_equipment(
    method: str,
    device_id: Optional[str] = None
):
    """
    Connect to physical countermeasure equipment
    """
    try:
        capture_method = CaptureMethod(method)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid capture method: {str(e)}"
        )
    
    result = physical.connect_hardware(capture_method, device_id)
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["message"]
        )
    
    return {
        "status": "success",
        "message": f"Connected to {method} equipment",
        "details": result
    }

# Emergency actions
@router.post("/emergency/shutdown/{drone_id}", response_model=Dict[str, Any])
async def emergency_shutdown(drone_id: str):
    """
    Emergency shutdown of a drone (CAUTION: will cause crash)
    """
    # Check if drone exists
    if drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {drone_id} not found"
        )
    
    # Get drone data
    drone = drone_simulator.drones[drone_id]
    
    # Attempt emergency shutdown
    result = takeover.emergency_shutdown(drone_id)
    
    # Apply takeover effect to the drone in the simulator
    updated_drone_data = takeover.simulate_takeover_effect(drone.dict())
    
    # Update drone in simulator
    for key, value in updated_drone_data.items():
        if hasattr(drone, key):
            setattr(drone, key, value)
    
    return {
        "status": "success",
        "message": f"Emergency shutdown initiated for drone {drone_id}",
        "details": result,
        "drone": drone.to_dict()
    }

@router.post("/emergency/jam/all", response_model=Dict[str, Any])
async def emergency_jam_all():
    """
    Emergency activation of all jammers at maximum power
    """
    # Jam all common drone frequencies
    frequencies = [2.4e9, 5.8e9, 1.57542e9, 433e6, 915e6]
    
    result = jammer.activate_jamming(
        frequency=frequencies,
        power_level=100,
        jammer_id="emergency_all_frequencies"
    )
    
    # Apply jamming effect to all drones
    for drone_id, drone in list(drone_simulator.drones.items()):
        updated_drone_data = jammer.simulate_jamming_effect(drone.dict(), 100)
        
        # Update drone in simulator
        for key, value in updated_drone_data.items():
            if hasattr(drone, key):
                setattr(drone, key, value)
    
    return {
        "status": "success",
        "message": "Emergency jamming activated on all frequencies",
        "details": result,
        "affected_drones": len(drone_simulator.drones)
    }

@router.post("/emergency/stop/all", response_model=Dict[str, Any])
async def emergency_stop_all():
    """
    Emergency stop of all countermeasures
    """
    # Stop all jammers
    jammer_result = jammer.emergency_shutdown()
    
    # Stop all takeovers
    takeover_targets = list(takeover.current_targets.keys())
    takeover_results = []
    
    for drone_id in takeover_targets:
        result = takeover.stop_takeover(drone_id)
        takeover_results.append(result)
    
    # Abort all physical countermeasures
    physical_operations = list(physical.active_countermeasures.keys())
    physical_results = []
    
    for operation_id in physical_operations:
        result = physical.abort_countermeasure(operation_id)
        physical_results.append(result)
    
    return {
        "status": "success",
        "message": "All countermeasures stopped",
        "jammer_result": jammer_result,
        "takeover_results": takeover_results,
        "physical_results": physical_results
    }