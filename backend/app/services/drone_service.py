"""
Service layer for drone-related business logic
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

from app.core.models import Drone, Alert, ThreatLevel, AlertType, GeoPoint
from app.api.websocket import broadcast_alert
from app.core.connection import connection_manager

logger = logging.getLogger(__name__)

class DroneService:
    """
    Service for drone-related operations
    This layer sits between the API routes and data access/simulator
    """
    
    @staticmethod
    async def analyze_drone_data(drone: Drone) -> Tuple[Drone, Optional[Alert]]:
        """
        Analyze drone data and update threat level, generate alerts if needed
        
        Args:
            drone: The drone to analyze
            
        Returns:
            Tuple containing updated drone and optional alert
        """
        # Copy drone to avoid modifying the original
        updated_drone = drone.copy()
        alert = None
        
        # Check for suspicious behavior based on drone properties
        threat_level = drone.threat_level
        
        # Update threat level based on signal strength
        # Very weak or very strong signals might be suspicious
        if drone.signal_strength < 20 or drone.signal_strength > 95:
            if threat_level.value in ('none', 'low'):
                threat_level = ThreatLevel.MEDIUM
        
        # Update threat level based on speed
        # Very fast drones might be suspicious
        if drone.speed and drone.speed > 30:  # m/s (~108 km/h)
            if threat_level.value in ('none', 'low', 'medium'):
                threat_level = ThreatLevel.HIGH
        
        # Check altitude (if available)
        # Very low or very high altitude might be suspicious
        if drone.location.altitude:
            if drone.location.altitude < 10 or drone.location.altitude > 1000:
                if threat_level.value in ('none', 'low'):
                    threat_level = ThreatLevel.MEDIUM
        
        # If the threat level has increased, generate an alert
        if threat_level != drone.threat_level:
            if threat_level.value in ('high', 'critical'):
                alert = Alert(
                    drone_id=drone.id,
                    alert_type=AlertType.UNAUTHORIZED_FLIGHT,
                    location=drone.location,
                    description=f"Suspicious behavior detected for {drone.type.value} drone",
                    threat_level=threat_level
                )
                
                # Log the alert
                logger.warning(
                    f"Threat level increased for drone {drone.id}: "
                    f"{drone.threat_level.value} -> {threat_level.value}"
                )
                
                # it makes sense to broadcast)
                try:
                    # Verify there are active connections before attempting to broadcast
                    if connection_manager.active_connections:
                        alert_dict = alert.dict()
                        alert_dict["timestamp"] = alert.timestamp.isoformat()
                        await connection_manager.broadcast({
                            "type": "alert",
                            "data": alert_dict
                        })
                except Exception as e:
                    logger.error(f"Error broadcasting alert: {e}")
            
            # Update drone threat level
            updated_drone.threat_level = threat_level
        
        return updated_drone, alert
    
    @staticmethod
    def filter_drones(
        drones: Dict[str, Drone],
        active_only: bool = True,
        min_threat: Optional[ThreatLevel] = None,
        drone_type: Optional[str] = None
    ) -> List[Drone]:
        """
        Filter drones based on criteria
        
        Args:
            drones: Dictionary of drone objects
            active_only: Only include active drones
            min_threat: Minimum threat level
            drone_type: Filter by drone type
            
        Returns:
            List of filtered drones
        """
        # Convert to list
        drone_list = list(drones.values())
        
        # Filter active drones (updated in the last minute)
        if active_only:
            cutoff_time = datetime.now() - timedelta(minutes=1)
            drone_list = [d for d in drone_list if d.timestamp >= cutoff_time]
        
        # Filter by minimum threat level
        if min_threat:
            # Convert enum to list for comparison
            threat_levels = list(ThreatLevel)
            min_idx = threat_levels.index(min_threat)
            # Filter drones with at least the specified threat level
            drone_list = [d for d in drone_list if threat_levels.index(d.threat_level) >= min_idx]
        
        # Filter by drone type
        if drone_type:
            drone_list = [d for d in drone_list if d.type.value == drone_type]
        
        return drone_list
    
    @staticmethod
    def calculate_drone_statistics(drones: List[Drone]) -> Dict[str, Any]:
        """
        Calculate statistics about drone detections
        
        Args:
            drones: List of drone objects
            
        Returns:
            Dictionary containing statistics
        """
        if not drones:
            return {
                "count": 0,
                "by_type": {},
                "by_threat": {},
                "avg_signal_strength": 0,
                "highest_threat_level": ThreatLevel.NONE.value,
                "highest_threat_drones": []
            }
        
        # Count by drone type
        type_counts = {}
        for drone in drones:
            type_val = drone.type.value
            type_counts[type_val] = type_counts.get(type_val, 0) + 1
        
        # Count by threat level
        threat_counts = {}
        for drone in drones:
            threat_val = drone.threat_level.value
            threat_counts[threat_val] = threat_counts.get(threat_val, 0) + 1
        
        # Calculate average signal strength
        avg_signal = sum(d.signal_strength for d in drones) / len(drones)
        
        # Get highest threat drones
        threat_levels = list(ThreatLevel)
        highest_threat = max([threat_levels.index(d.threat_level) for d in drones])
        highest_threat_drones = [
            d for d in drones 
            if threat_levels.index(d.threat_level) == highest_threat
        ]
        
        return {
            "count": len(drones),
            "by_type": type_counts,
            "by_threat": threat_counts,
            "avg_signal_strength": avg_signal,
            "highest_threat_level": threat_levels[highest_threat].value,
            "highest_threat_drones": [d.to_dict() for d in highest_threat_drones]
        }