"""
API routes for drone detection and management
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends, status
from datetime import datetime, timedelta

from app.core.models import Drone, Alert, ThreatLevel, DroneType
from app.main import drone_simulator  # Import the global simulator instance

router = APIRouter()

@router.get("/drones", response_model=List[Dict[str, Any]])
async def get_drones(
    active_only: bool = Query(True, description="Only return currently active drones"),
    min_threat: ThreatLevel = Query(None, description="Filter by minimum threat level"),
    drone_type: DroneType = Query(None, description="Filter by drone type")
):
    """
    Get list of detected drones with optional filtering
    """
    # Get all drones from simulator
    drones = list(drone_simulator.drones.values())
    
    # Apply filters
    if active_only:
        # Only include drones with updates in the last minute
        cutoff_time = datetime.now() - timedelta(minutes=1)
        drones = [d for d in drones if d.timestamp >= cutoff_time]
    
    if min_threat:
        # Convert enum to list for comparison
        threat_levels = list(ThreatLevel)
        min_idx = threat_levels.index(min_threat)
        # Filter drones with at least the specified threat level
        drones = [d for d in drones if threat_levels.index(d.threat_level) >= min_idx]
    
    if drone_type:
        # Filter by drone type
        drones = [d for d in drones if d.type == drone_type]
    
    # Convert to dict format for response
    return [d.to_dict() for d in drones]

@router.get("/drones/{drone_id}", response_model=Dict[str, Any])
async def get_drone(drone_id: str):
    """
    Get details for a specific drone by ID
    """
    if drone_id not in drone_simulator.drones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone with ID {drone_id} not found"
        )
    
    return drone_simulator.drones[drone_id].to_dict()

@router.get("/alerts", response_model=List[Dict[str, Any]])
async def get_alerts(
    limit: int = Query(10, ge=1, le=100, description="Maximum number of alerts to return"),
    acknowledged: bool = Query(None, description="Filter by acknowledgement status")
):
    """
    Get list of alerts with optional filtering
    """
    # Get alerts from simulator and sort by timestamp (newest first)
    alerts = sorted(
        drone_simulator.alerts,
        key=lambda a: a.timestamp,
        reverse=True
    )
    
    # Apply filters
    if acknowledged is not None:
        alerts = [a for a in alerts if a.is_acknowledged == acknowledged]
    
    # Apply limit
    alerts = alerts[:limit]
    
    # Convert to dict format
    return [
        {**a.dict(), "timestamp": a.timestamp.isoformat()}
        for a in alerts
    ]

@router.post("/alerts/{alert_id}/acknowledge", response_model=Dict[str, Any])
async def acknowledge_alert(alert_id: str):
    """
    Mark an alert as acknowledged
    """
    # Find the alert
    for i, alert in enumerate(drone_simulator.alerts):
        if alert.id == alert_id:
            # Update the alert
            drone_simulator.alerts[i].is_acknowledged = True
            return {
                "status": "success",
                "message": f"Alert {alert_id} acknowledged",
                "alert": {
                    **drone_simulator.alerts[i].dict(),
                    "timestamp": drone_simulator.alerts[i].timestamp.isoformat()
                }
            }
    
    # Alert not found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Alert with ID {alert_id} not found"
    )

@router.get("/stats", response_model=Dict[str, Any])
async def get_drone_stats():
    """
    Get statistics about drone detections
    """
    drones = list(drone_simulator.drones.values())
    
    # Skip stats if no drones
    if not drones:
        return {
            "count": 0,
            "by_type": {},
            "by_threat": {}
        }
    
    # Count by drone type
    type_counts = {}
    for t in DroneType:
        type_counts[t.value] = len([d for d in drones if d.type == t])
    
    # Count by threat level
    threat_counts = {}
    for t in ThreatLevel:
        threat_counts[t.value] = len([d for d in drones if d.threat_level == t])
    
    # Calculate average signal strength
    avg_signal = sum(d.signal_strength for d in drones) / len(drones)
    
    # Get highest threat drones
    threat_levels = list(ThreatLevel)
    highest_threat = max([threat_levels.index(d.threat_level) for d in drones])
    highest_threat_drones = [
        d.to_dict() for d in drones 
        if threat_levels.index(d.threat_level) == highest_threat
    ]
    
    return {
        "count": len(drones),
        "by_type": type_counts,
        "by_threat": threat_counts,
        "avg_signal_strength": avg_signal,
        "highest_threat_level": threat_levels[highest_threat].value,
        "highest_threat_drones": highest_threat_drones
    }