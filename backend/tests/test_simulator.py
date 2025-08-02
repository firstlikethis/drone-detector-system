"""
Tests for the drone simulator
"""
import pytest
from datetime import datetime

from app.core.models import Drone, GeoPoint, DroneType, ThreatLevel
from app.simulator.drone_simulator import DroneSimulator
from app.simulator.geo_utils import (
    calculate_distance, 
    is_point_in_border, 
    calculate_new_position
)

def test_drone_simulator_init():
    """Test simulator initialization"""
    # Test with default values
    simulator = DroneSimulator()
    assert simulator.num_drones == 5
    assert simulator.update_interval == 1.0
    assert "center" in simulator.border
    
    # Test with custom values
    custom_border = {
        "center": {"latitude": 15.0, "longitude": 100.0},
        "width": 0.2,
        "height": 0.2,
        "rotation": 45
    }
    simulator = DroneSimulator(
        border=custom_border,
        num_drones=10,
        update_interval=0.5
    )
    
    assert simulator.num_drones == 10
    assert simulator.update_interval == 0.5
    assert simulator.border == custom_border
    assert simulator.drones == {}
    assert simulator.alerts == []

def test_create_random_drone():
    """Test creating random drones"""
    simulator = DroneSimulator()
    
    # Create a drone
    drone = simulator._create_random_drone()
    
    # Check that it has all the required properties
    assert isinstance(drone, Drone)
    assert drone.id is not None
    assert isinstance(drone.timestamp, datetime)
    assert isinstance(drone.location, GeoPoint)
    assert isinstance(drone.type, DroneType)
    assert 0 <= drone.signal_strength <= 100
    assert isinstance(drone.speed, float)
    assert 0 <= drone.heading < 360
    assert isinstance(drone.threat_level, ThreatLevel)
    assert isinstance(drone.estimated_size, float)
    assert 0 <= drone.confidence <= 1
    assert isinstance(drone.metadata, dict)
    
    # Create another drone with a specific ID
    test_id = "test123"
    drone = simulator._create_random_drone(drone_id=test_id)
    assert drone.id == test_id

def test_update_drone_position():
    """Test updating drone position"""
    simulator = DroneSimulator()
    
    # Create a drone with known properties
    drone = Drone(
        id="test1",
        location=GeoPoint(latitude=16.7769, longitude=98.9761, altitude=100),
        type=DroneType.COMMERCIAL,
        signal_strength=80,
        speed=10,  # 10 m/s
        heading=90,  # Due East
        threat_level=ThreatLevel.LOW,
        estimated_size=1.0,
        confidence=0.9,
        metadata={"test": "value"}
    )
    
    # Update position
    updated_drone = simulator._update_drone_position(drone)
    
    # The drone should have moved eastward
    assert updated_drone.location.longitude > drone.location.longitude
    # Latitude should be similar (might change slightly due to random drift)
    assert abs(updated_drone.location.latitude - drone.location.latitude) < 0.01
    # Timestamp should be updated
    assert updated_drone.timestamp > drone.timestamp

def test_check_for_alerts():
    """Test alert generation"""
    simulator = DroneSimulator()
    
    # Create a drone far from any restricted zones
    normal_drone = Drone(
        id="normal1",
        location=GeoPoint(
            latitude=simulator.border["center"]["latitude"] + 0.05,
            longitude=simulator.border["center"]["longitude"] + 0.05,
            altitude=100
        ),
        type=DroneType.COMMERCIAL,
        signal_strength=80,
        speed=5,
        heading=90,
        threat_level=ThreatLevel.NONE,
        estimated_size=1.0,
        confidence=0.9
    )
    
    # This drone should not trigger an alert
    alert = simulator._check_for_alerts(normal_drone)
    assert alert is None
    
    # Create a drone in a restricted zone
    # The restricted zone is a circle with radius = min(width, height) / 6
    # around the center of the border
    restricted_drone = Drone(
        id="restricted1",
        location=GeoPoint(
            latitude=simulator.border["center"]["latitude"] + 0.001,
            longitude=simulator.border["center"]["longitude"] + 0.001,
            altitude=100
        ),
        type=DroneType.COMMERCIAL,
        signal_strength=80,
        speed=5,
        heading=90,
        threat_level=ThreatLevel.NONE,
        estimated_size=1.0,
        confidence=0.9
    )
    
    # This drone should trigger a restricted zone alert
    alert = simulator._check_for_alerts(restricted_drone)
    assert alert is not None
    assert alert.alert_type.value == "restricted_zone"
    
    # Create a high-threat drone
    high_threat_drone = Drone(
        id="threat1",
        location=GeoPoint(
            latitude=simulator.border["center"]["latitude"] + 0.02,
            longitude=simulator.border["center"]["longitude"] + 0.02,
            altitude=100
        ),
        type=DroneType.MILITARY,
        signal_strength=60,
        speed=30,
        heading=180,
        threat_level=ThreatLevel.HIGH,
        estimated_size=3.0,
        confidence=0.7
    )
    
    # This drone should trigger a high threat alert
    alert = simulator._check_for_alerts(high_threat_drone)
    assert alert is not None
    assert alert.alert_type.value == "unauthorized_flight"
    assert alert.threat_level == ThreatLevel.HIGH

def test_geo_utils():
    """Test geo utilities"""
    # Test distance calculation
    point1 = GeoPoint(latitude=16.7769, longitude=98.9761)
    point2 = GeoPoint(latitude=16.7869, longitude=98.9861)
    
    distance = calculate_distance(point1, point2)
    # Distance should be approximately 1.4 km
    assert 1.3 < distance < 1.5
    
    # Test border check
    border = {
        "center": {"latitude": 16.7769, "longitude": 98.9761},
        "width": 0.1,
        "height": 0.1,
        "rotation": 0
    }
    
    # Point inside border
    point_in = GeoPoint(latitude=16.7769, longitude=98.9761)
    assert is_point_in_border(point_in, border) is True
    
    # Point outside border
    point_out = GeoPoint(latitude=16.8769, longitude=98.9761)  # 1 degree north
    assert is_point_in_border(point_out, border) is False
    
    # Test position calculation
    start = GeoPoint(latitude=16.7769, longitude=98.9761, altitude=100)
    heading = 90  # Due East
    speed = 10  # 10 m/s
    time_delta = 60  # 1 minute
    
    new_pos = calculate_new_position(start, heading, speed, time_delta)
    
    # Should have moved east, latitude similar, longitude increased
    assert abs(new_pos.latitude - start.latitude) < 0.001
    assert new_pos.longitude > start.longitude
    assert new_pos.altitude == start.altitude