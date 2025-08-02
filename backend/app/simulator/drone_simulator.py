"""
Drone Simulator Module

Generates simulated drone data for testing and development
"""
import asyncio
import random
import logging
import math
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.core.models import (
    Drone, 
    GeoPoint, 
    DroneType, 
    ThreatLevel, 
    AlertType, 
    Alert,
    ConnectionManager
)

logger = logging.getLogger(__name__)

# Configuration for the simulator
# Default border area (customize for your needs)
DEFAULT_BORDER = {
    # Thailand-Myanmar border area example (approximate)
    "center": {"latitude": 16.7769, "longitude": 98.9761},  # Mae Sot area
    "width": 0.1,  # Degrees longitude (~10km)
    "height": 0.1,  # Degrees latitude (~10km)
    "rotation": 0  # Degrees (clockwise from north)
}

class DroneSimulator:
    """Generates simulated drone activity near border areas"""
    
    def __init__(self, 
                 border: Dict[str, Any] = None, 
                 num_drones: int = 5,
                 update_interval: float = 1.0):
        """
        Initialize the drone simulator
        
        Args:
            border: Border area configuration
            num_drones: Number of drones to simulate
            update_interval: Time between updates in seconds
        """
        self.border = border or DEFAULT_BORDER
        self.num_drones = num_drones
        self.update_interval = update_interval
        self.drones: Dict[str, Drone] = {}
        self.alerts: List[Alert] = []
        
    def _random_drone_type(self) -> DroneType:
        """Generate a random drone type with realistic distribution"""
        weights = {
            DroneType.COMMERCIAL: 0.7,
            DroneType.DIY: 0.2,
            DroneType.MILITARY: 0.05,
            DroneType.UNKNOWN: 0.05
        }
        return random.choices(
            list(weights.keys()), 
            weights=list(weights.values()), 
            k=1
        )[0]
    
    def _generate_random_location(self, border_distance_factor: float = 0.5) -> GeoPoint:
        """
        Generate a random location near the border
        
        Args:
            border_distance_factor: Controls how close to the border (0-1)
                                    0 = on border, 1 = anywhere in area
        """
        # Get border parameters
        center = self.border["center"]
        width = self.border["width"]
        height = self.border["height"]
        
        # Random offset from center (biased toward border)
        x_offset = (random.random() * 2 - 1) * width / 2
        y_offset = (random.random() * 2 - 1) * height / 2
        
        # Adjust to be closer to border if factor is low
        if border_distance_factor < 1.0:
            # Calculate distance from center as percentage of max
            dist = math.sqrt(x_offset**2 + y_offset**2) / math.sqrt((width/2)**2 + (height/2)**2)
            
            # If too far from border, move it closer to edge
            if dist < (1 - border_distance_factor):
                # Normalize to unit vector
                if dist > 0:
                    x_offset /= dist
                    y_offset /= dist
                else:
                    # Random direction if at center
                    angle = random.random() * 2 * math.pi
                    x_offset = math.cos(angle)
                    y_offset = math.sin(angle)
                
                # Scale to be near border based on factor
                edge_distance = 1.0 - border_distance_factor * random.random()
                x_offset *= edge_distance * width / 2
                y_offset *= edge_distance * height / 2
        
        # Apply rotation if specified
        if self.border.get("rotation", 0) != 0:
            rotation_rad = math.radians(self.border["rotation"])
            x_old, y_old = x_offset, y_offset
            x_offset = x_old * math.cos(rotation_rad) - y_old * math.sin(rotation_rad)
            y_offset = x_old * math.sin(rotation_rad) + y_old * math.cos(rotation_rad)
        
        # Calculate final coordinates
        latitude = center["latitude"] + y_offset
        longitude = center["longitude"] + x_offset
        altitude = random.uniform(50, 500)  # Random altitude 50-500m
        
        return GeoPoint(
            latitude=latitude,
            longitude=longitude,
            altitude=altitude
        )
    
    def _is_in_restricted_zone(self, location: GeoPoint) -> bool:
        """Check if a location is in a restricted zone"""
        # Example implementation - replace with actual restricted zone logic
        # Here we'll use a simple circular zone around the center
        center = self.border["center"]
        restricted_zone_radius = min(self.border["width"], self.border["height"]) / 6
        
        # Calculate distance from center
        dx = (location.longitude - center["longitude"]) * math.cos(math.radians(location.latitude))
        dy = location.latitude - center["latitude"]
        distance = math.sqrt(dx**2 + dy**2)
        
        return distance < restricted_zone_radius
    
    def _create_random_drone(self, drone_id: Optional[str] = None) -> Drone:
        """Create a new random drone"""
        drone_type = self._random_drone_type()
        location = self._generate_random_location()
        
        # Random properties based on drone type
        if drone_type == DroneType.MILITARY:
            signal_strength = random.uniform(30, 70)  # Military drones may have signal dampening
            speed = random.uniform(10, 40)  # Faster
            threat_level = random.choice([ThreatLevel.MEDIUM, ThreatLevel.HIGH])
            confidence = random.uniform(0.5, 0.8)  # Harder to identify with certainty
            size = random.uniform(2, 5)  # Larger
        elif drone_type == DroneType.COMMERCIAL:
            signal_strength = random.uniform(60, 90)  # Strong commercial signals
            speed = random.uniform(5, 15)
            threat_level = random.choice([ThreatLevel.NONE, ThreatLevel.LOW])
            confidence = random.uniform(0.7, 0.95)  # Easy to identify
            size = random.uniform(0.3, 1.5)  # Smaller
        elif drone_type == DroneType.DIY:
            signal_strength = random.uniform(50, 85)
            speed = random.uniform(3, 20)
            threat_level = random.choice([ThreatLevel.LOW, ThreatLevel.MEDIUM])
            confidence = random.uniform(0.6, 0.9)
            size = random.uniform(0.2, 1.0)
        else:  # UNKNOWN
            signal_strength = random.uniform(20, 60)
            speed = random.uniform(5, 25)
            threat_level = random.choice([ThreatLevel.LOW, ThreatLevel.MEDIUM, ThreatLevel.HIGH])
            confidence = random.uniform(0.3, 0.7)
            size = random.uniform(0.5, 3)
        
        # Increase threat level if in restricted zone
        if self._is_in_restricted_zone(location):
            threat_levels = list(ThreatLevel)
            current_index = threat_levels.index(threat_level)
            if current_index < len(threat_levels) - 1:
                threat_level = threat_levels[current_index + 1]
        
        return Drone(
            id=drone_id or str(random.randint(10000, 99999)),
            location=location,
            type=drone_type,
            signal_strength=signal_strength,
            speed=speed,
            heading=random.uniform(0, 360),
            threat_level=threat_level,
            estimated_size=size,
            confidence=confidence,
            metadata={
                "battery": random.uniform(30, 100),
                "model": f"Drone-{random.randint(100, 999)}",
                "frequency": f"{random.uniform(2.4, 5.8):.1f} GHz"
            }
        )
    
    def _update_drone_position(self, drone: Drone) -> Drone:
        """Update a drone's position based on its heading and speed"""
        if drone.speed is None or drone.heading is None:
            return drone
        
        # Convert heading to radians (0° is North, 90° is East)
        heading_rad = math.radians(90 - drone.heading)
        
        # Calculate distance moved in degrees
        # Approximate 1 degree = 111km at equator
        # For more accuracy, this would need to account for the earth's curvature
        time_factor = self.update_interval / 3600  # Convert seconds to hours
        speed_km_h = drone.speed * 3.6  # Convert m/s to km/h
        distance_km = speed_km_h * time_factor
        distance_deg = distance_km / 111
        
        # Calculate new position
        dx = distance_deg * math.cos(heading_rad)
        dy = distance_deg * math.sin(heading_rad)
        
        # Apply small random drift to simulate real-world conditions
        drift_factor = 0.2  # 20% maximum drift
        dx += random.uniform(-drift_factor, drift_factor) * distance_deg
        dy += random.uniform(-drift_factor, drift_factor) * distance_deg
        
        new_lon = drone.location.longitude + dx
        new_lat = drone.location.latitude + dy
        
        # Create updated drone with new position
        updated_drone = drone.copy(
            update={
                "location": GeoPoint(
                    latitude=new_lat,
                    longitude=new_lon,
                    altitude=drone.location.altitude + random.uniform(-10, 10)  # Small altitude changes
                ),
                "timestamp": datetime.now(),
                # Occasionally change heading slightly
                "heading": (drone.heading + random.uniform(-15, 15)) % 360 if random.random() < 0.3 else drone.heading,
                # Occasionally change speed slightly
                "speed": max(0, drone.speed + random.uniform(-1, 1)) if random.random() < 0.3 else drone.speed,
                # Fluctuate signal strength
                "signal_strength": min(100, max(0, drone.signal_strength + random.uniform(-5, 5)))
            }
        )
        
        return updated_drone
    
    def _check_for_alerts(self, drone: Drone) -> Optional[Alert]:
        """Check if a drone triggers any alerts"""
        # Check if drone is in restricted zone
        if self._is_in_restricted_zone(drone.location):
            return Alert(
                drone_id=drone.id,
                alert_type=AlertType.RESTRICTED_ZONE,
                location=drone.location,
                description=f"{drone.type.value.capitalize()} drone detected in restricted zone",
                threat_level=drone.threat_level
            )
        
        # Check if drone crosses border (simplified example)
        border_center = self.border["center"]
        if drone.location.longitude < border_center["longitude"] - self.border["width"]/2:
            return Alert(
                drone_id=drone.id,
                alert_type=AlertType.BORDER_VIOLATION,
                location=drone.location,
                description=f"Border crossing by {drone.type.value} drone",
                threat_level=ThreatLevel.HIGH
            )
        
        # Check for high threat level drones
        if drone.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
            return Alert(
                drone_id=drone.id,
                alert_type=AlertType.UNAUTHORIZED_FLIGHT,
                location=drone.location,
                description=f"High-threat {drone.type.value} drone detected",
                threat_level=drone.threat_level
            )
        
        return None
    
    async def run_simulation(self, connection_manager: ConnectionManager):
        """
        Main simulation loop - runs continuously to update drone positions
        and broadcast updates to connected clients
        """
        logger.info(f"Starting drone simulator with {self.num_drones} drones")
        
        # Initialize drones
        for _ in range(self.num_drones):
            drone = self._create_random_drone()
            self.drones[drone.id] = drone
        
        try:
            while True:
                # Update all drone positions
                for drone_id, drone in list(self.drones.items()):
                    # Update position
                    updated_drone = self._update_drone_position(drone)
                    self.drones[drone_id] = updated_drone
                    
                    # Check for alerts
                    alert = self._check_for_alerts(updated_drone)
                    if alert:
                        self.alerts.append(alert)
                        # Broadcast alert to clients
                        alert_data = alert.dict()
                        alert_data["timestamp"] = alert.timestamp.isoformat()
                        await connection_manager.broadcast({
                            "type": "alert",
                            "data": alert_data
                        })
                
                # Occasionally add or remove drones to simulate new detections/lost signals
                if random.random() < 0.05:  # 5% chance each update
                    if random.random() < 0.7 and len(self.drones) < self.num_drones + 3:
                        # Add a new drone
                        new_drone = self._create_random_drone()
                        self.drones[new_drone.id] = new_drone
                        # Create a "new detection" alert
                        alert = Alert(
                            drone_id=new_drone.id,
                            alert_type=AlertType.NEW_DETECTION,
                            location=new_drone.location,
                            description=f"New {new_drone.type.value} drone detected",
                            threat_level=new_drone.threat_level
                        )
                        self.alerts.append(alert)
                        # Broadcast alert
                        alert_data = alert.dict()
                        alert_data["timestamp"] = alert.timestamp.isoformat()
                        await connection_manager.broadcast({
                            "type": "alert",
                            "data": alert_data
                        })
                    elif self.drones and len(self.drones) > self.num_drones - 2:
                        # Remove a random drone (lost signal)
                        drone_id = random.choice(list(self.drones.keys()))
                        del self.drones[drone_id]
                
                # Broadcast current drone positions to all clients
                drone_data = [drone.to_dict() for drone in self.drones.values()]
                await connection_manager.broadcast({
                    "type": "drones",
                    "data": drone_data
                })
                
                # Wait for next update
                await asyncio.sleep(self.update_interval)
                
        except asyncio.CancelledError:
            logger.info("Drone simulator task cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in drone simulator: {e}", exc_info=True)
            raise