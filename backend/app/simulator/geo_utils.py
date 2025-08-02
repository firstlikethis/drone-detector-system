"""
Geographic utilities for the drone simulator
"""
import math
from typing import Dict, Any, Tuple, List, Optional, Union

from app.core.models import GeoPoint

# Earth radius in kilometers
EARTH_RADIUS_KM = 6371.0

def calculate_distance(point1: GeoPoint, point2: GeoPoint) -> float:
    """
    Calculate the distance between two geographic points using the Haversine formula
    
    Args:
        point1: First geographic point
        point2: Second geographic point
        
    Returns:
        Distance in kilometers
    """
    # Convert latitude and longitude from degrees to radians
    lat1 = math.radians(point1.latitude)
    lon1 = math.radians(point1.longitude)
    lat2 = math.radians(point2.latitude)
    lon2 = math.radians(point2.longitude)
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = EARTH_RADIUS_KM * c
    
    return distance

def calculate_bearing(point1: GeoPoint, point2: GeoPoint) -> float:
    """
    Calculate the bearing (direction) from point1 to point2
    
    Args:
        point1: Starting point
        point2: Destination point
        
    Returns:
        Bearing in degrees (0-360, where 0 is North)
    """
    # Convert latitude and longitude from degrees to radians
    lat1 = math.radians(point1.latitude)
    lon1 = math.radians(point1.longitude)
    lat2 = math.radians(point2.latitude)
    lon2 = math.radians(point2.longitude)
    
    # Calculate bearing
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    bearing_rad = math.atan2(y, x)
    
    # Convert to degrees and normalize to 0-360
    bearing_deg = math.degrees(bearing_rad)
    bearing_normalized = (bearing_deg + 360) % 360
    
    return bearing_normalized

def is_point_in_polygon(point: GeoPoint, polygon: List[Tuple[float, float]]) -> bool:
    """
    Check if a point is inside a polygon using the ray casting algorithm
    
    Args:
        point: The point to check
        polygon: List of (latitude, longitude) tuples forming the polygon
        
    Returns:
        True if the point is inside the polygon, False otherwise
    """
    # Ray casting algorithm
    x, y = point.latitude, point.longitude
    n = len(polygon)
    inside = False
    
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    
    return inside

def is_point_in_border(point: GeoPoint, border: Dict[str, Any]) -> bool:
    """
    Check if a point is inside the border area
    
    Args:
        point: The point to check
        border: Border configuration with center, width, height, and rotation
        
    Returns:
        True if the point is inside the border, False otherwise
    """
    # Extract border properties
    center = border["center"]
    width = border["width"]
    height = border["height"]
    rotation = border.get("rotation", 0)
    
    # Convert to radians
    rotation_rad = math.radians(rotation)
    
    # Calculate center point coordinates
    center_lat = center["latitude"]
    center_lon = center["longitude"]
    
    # Calculate relative position
    dx = point.longitude - center_lon
    dy = point.latitude - center_lat
    
    # Apply rotation (inverse)
    if rotation != 0:
        dx_rotated = dx * math.cos(-rotation_rad) - dy * math.sin(-rotation_rad)
        dy_rotated = dx * math.sin(-rotation_rad) + dy * math.cos(-rotation_rad)
        dx, dy = dx_rotated, dy_rotated
    
    # Check if point is within the rectangle
    half_width = width / 2
    half_height = height / 2
    
    return -half_width <= dx <= half_width and -half_height <= dy <= half_height

def get_random_point_in_border(
    border: Dict[str, Any],
    edge_bias: float = 0.0,
    min_distance: float = 0.0,
    max_distance: Optional[float] = None
) -> GeoPoint:
    """
    Generate a random point within the border area with optional edge bias
    
    Args:
        border: Border configuration with center, width, height, and rotation
        edge_bias: Bias towards the edge (0.0 = uniform distribution, 1.0 = only on edges)
        min_distance: Minimum distance from center in border units (0.0-1.0)
        max_distance: Maximum distance from center in border units (0.0-1.0)
        
    Returns:
        Random GeoPoint within the border
    """
    import random
    
    # Extract border properties
    center = border["center"]
    width = border["width"]
    height = border["height"]
    rotation = border.get("rotation", 0)
    
    # Convert to radians
    rotation_rad = math.radians(rotation)
    
    # Calculate center point coordinates
    center_lat = center["latitude"]
    center_lon = center["longitude"]
    
    # Calculate half dimensions
    half_width = width / 2
    half_height = height / 2
    
    # Set max_distance if not provided
    if max_distance is None:
        max_distance = 1.0
    
    # Ensure distance constraints are valid
    min_distance = max(0.0, min(1.0, min_distance))
    max_distance = max(min_distance, min(1.0, max_distance))
    
    # Adjust for edge bias
    edge_bias = max(0.0, min(1.0, edge_bias))
    
    # Generate random distance from center (with edge bias)
    if edge_bias > 0:
        # Apply edge bias by raising a random value to a power
        # Higher edge_bias = more points near the edge
        distance = min_distance + (max_distance - min_distance) * (
            1.0 - (1.0 - random.random()) ** (1.0 / (1.0 - edge_bias))
        )
    else:
        # Uniform distribution between min and max distance
        distance = min_distance + (max_distance - min_distance) * random.random()
    
    # Generate random angle
    angle = random.uniform(0, 2 * math.pi)
    
    # Calculate elliptical coordinates
    dx = distance * half_width * math.cos(angle)
    dy = distance * half_height * math.sin(angle)
    
    # Apply rotation
    if rotation != 0:
        dx_rotated = dx * math.cos(rotation_rad) - dy * math.sin(rotation_rad)
        dy_rotated = dx * math.sin(rotation_rad) + dy * math.cos(rotation_rad)
        dx, dy = dx_rotated, dy_rotated
    
    # Calculate final coordinates
    latitude = center_lat + dy
    longitude = center_lon + dx
    
    # Generate random altitude (50-500m)
    altitude = random.uniform(50, 500)
    
    return GeoPoint(
        latitude=latitude,
        longitude=longitude,
        altitude=altitude
    )

def calculate_new_position(
    start: Union[GeoPoint, Dict[str, Any]],
    heading: float,
    speed: float,
    time_delta: float
) -> GeoPoint:
    """
    Calculate a new position based on current position, heading, speed, and time
    
    Args:
        start: Starting position (GeoPoint or dict with latitude, longitude, altitude keys)
        heading: Heading in degrees (0-360, where 0 is North)
        speed: Speed in meters per second
        time_delta: Time delta in seconds
        
    Returns:
        New GeoPoint
    """
    # ตรวจสอบว่า start เป็น dict หรือ GeoPoint
    if isinstance(start, dict):
        # ถ้าเป็น dict ให้แปลงเป็น GeoPoint
        start_lat = start.get("latitude")
        start_lon = start.get("longitude")
        start_alt = start.get("altitude")
        
        # ถ้า key ไม่ถูกต้อง ให้ลองหาในรูปแบบอื่น
        if start_lat is None and "lat" in start:
            start_lat = start["lat"]
        if start_lon is None and "lon" in start:
            start_lon = start["lon"]
        if start_lon is None and "longitude" in start:
            start_lon = start["longitude"]
        if start_alt is None and "alt" in start:
            start_alt = start["alt"]
        
        # สร้าง GeoPoint จาก dict
        start_point = GeoPoint(
            latitude=start_lat,
            longitude=start_lon,
            altitude=start_alt
        )
    else:
        # ถ้าเป็น GeoPoint อยู่แล้ว ใช้ได้เลย
        start_point = start
    
    # Convert heading to radians (0° is North, 90° is East)
    heading_rad = math.radians(90 - heading)
    
    # Calculate distance in kilometers
    distance_km = (speed * time_delta) / 1000
    
    # Convert distance to degrees (approximately)
    # 1 degree latitude = 111 km (roughly)
    # 1 degree longitude = 111 km * cos(latitude) (varies with latitude)
    lat_rad = math.radians(start_point.latitude)
    lon_km_per_degree = 111.32 * math.cos(lat_rad)
    
    # Calculate offsets
    lat_offset = (distance_km * math.sin(heading_rad)) / 111.32
    lon_offset = (distance_km * math.cos(heading_rad)) / lon_km_per_degree
    
    # Calculate new position
    new_lat = start_point.latitude + lat_offset
    new_lon = start_point.longitude + lon_offset
    
    # Keep altitude the same
    return GeoPoint(
        latitude=new_lat,
        longitude=new_lon,
        altitude=start_point.altitude
    )