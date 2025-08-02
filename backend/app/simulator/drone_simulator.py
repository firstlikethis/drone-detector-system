"""
Drone Simulator Module

Generates simulated drone data for testing and development
"""
import asyncio
import random
import logging
import math
import uuid
from datetime import datetime, timedelta
from app.countermeasures import jammer, takeover, physical
from typing import List, Dict, Any, Optional, Tuple, Union

from app.core.models import (
    Drone, 
    GeoPoint, 
    DroneType, 
    ThreatLevel, 
    AlertType, 
    Alert,
    ConnectionManager
)
from app.services.drone_service import DroneService
from app.simulator.geo_utils import (
    calculate_distance,
    is_point_in_border,
    calculate_new_position,
    get_random_point_in_border
)
from app.config import settings

logger = logging.getLogger(__name__)

class DroneSimulator:
    """Generates simulated drone activity near border areas"""
    
    def __init__(self, 
                 border: Dict[str, Any] = None, 
                 num_drones: int = None,
                 update_interval: float = None):
        """
        Initialize the drone simulator
        
        Args:
            border: Border area configuration
            num_drones: Number of drones to simulate
            update_interval: Time between updates in seconds
        """
        self.border = border or settings.default_border
        self.num_drones = num_drones or settings.SIM_DEFAULT_DRONES
        self.update_interval = update_interval or settings.SIM_UPDATE_INTERVAL
        self.drones: Dict[str, Drone] = {}
        self.alerts: List[Alert] = []
        
        # สร้าง 'hot zones' เพื่อทำให้โดรนไม่กระจายตัวแบบสุ่มทั่วทั้งพื้นที่
        # แต่จะมีแนวโน้มที่จะปรากฏในพื้นที่เฉพาะบางจุด
        self.hot_zones = self._create_hot_zones()
        
        # เก็บรายละเอียดของวัตถุประสงค์ของโดรนแต่ละตัว
        self.drone_missions: Dict[str, Dict[str, Any]] = {}

    def _create_hot_zones(self, num_zones: int = 3) -> List[Dict[str, Any]]:
        """
        Create hot zones where drones are likely to appear or move through
        
        Args:
            num_zones: Number of hot zones to create
            
        Returns:
            List of hot zone definitions
        """
        hot_zones = []
        
        # คำนวณความกว้างและความสูงของพื้นที่
        border_width = self.border["width"]
        border_height = self.border["height"]
        
        # Hot zone อาจเป็นจุดตามชายแดนหรือทางเข้าออก
        for _ in range(num_zones):
            # สุ่มตำแหน่งที่อยู่ใกล้ขอบของพื้นที่
            is_horizontal_edge = random.choice([True, False])
            
            if is_horizontal_edge:
                # อยู่ที่ขอบบนหรือล่าง
                latitude = self.border["center"]["latitude"] + (border_height / 2) * random.choice([-0.9, 0.9])
                longitude = self.border["center"]["longitude"] + random.uniform(-0.8, 0.8) * (border_width / 2)
            else:
                # อยู่ที่ขอบซ้ายหรือขวา
                latitude = self.border["center"]["latitude"] + random.uniform(-0.8, 0.8) * (border_height / 2)
                longitude = self.border["center"]["longitude"] + (border_width / 2) * random.choice([-0.9, 0.9])
            
            # กำหนดขนาดของ hot zone
            radius = min(border_width, border_height) * random.uniform(0.05, 0.15)
            
            hot_zones.append({
                "center": {
                    "latitude": latitude,
                    "longitude": longitude
                },
                "radius": radius,  # หน่วยเป็นองศา
                "weight": random.uniform(0.5, 1.0)  # น้ำหนักความสำคัญของโซนนี้
            })
        
        # เพิ่ม hot zone ที่เป็นเขตหวงห้ามตรงกลางด้วย
        hot_zones.append({
            "center": {
                "latitude": self.border["center"]["latitude"],
                "longitude": self.border["center"]["longitude"]
            },
            "radius": min(border_width, border_height) * 0.1,
            "weight": 0.8,
            "restricted": True  # ทำเครื่องหมายว่าเป็นเขตหวงห้าม
        })
        
        return hot_zones
            
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
    
    def _generate_random_location(self, prefer_hot_zones: bool = True) -> GeoPoint:
        """
        Generate a random location in the border area
        
        Args:
            prefer_hot_zones: Whether to prefer locations in hot zones
            
        Returns:
            Random GeoPoint
        """
        if prefer_hot_zones and self.hot_zones and random.random() < 0.7:
            # เลือก hot zone แบบสุ่มโดยใช้น้ำหนักความสำคัญ
            weights = [zone["weight"] for zone in self.hot_zones]
            selected_zone = random.choices(self.hot_zones, weights=weights, k=1)[0]
            
            # สุ่มจุดภายใน hot zone
            angle = random.uniform(0, 2 * math.pi)
            # ระยะทางจากจุดศูนย์กลาง (สุ่มแบบไม่เท่ากัน - มีแนวโน้มใกล้จุดศูนย์กลาง)
            distance = selected_zone["radius"] * math.sqrt(random.random())
            
            # คำนวณพิกัด
            lat = selected_zone["center"]["latitude"] + distance * math.sin(angle)
            lon = selected_zone["center"]["longitude"] + distance * math.cos(angle)
            
            # สุ่มความสูง
            altitude = random.uniform(50, 500)
            
            return GeoPoint(
                latitude=lat,
                longitude=lon,
                altitude=altitude
            )
        else:
            # ใช้ฟังก์ชันเดิมสำหรับการสุ่มทั่วทั้งพื้นที่
            return get_random_point_in_border(
                self.border,
                edge_bias=0.4,  # เพิ่มโอกาสที่จะอยู่ใกล้ขอบ
                min_distance=0.0,
                max_distance=0.95
            )
    
    def _is_in_restricted_zone(self, location: GeoPoint) -> bool:
        """Check if a location is in a restricted zone"""
        # ตรวจสอบจากเขตหวงห้ามที่กำหนดไว้ใน hot_zones
        for zone in self.hot_zones:
            if zone.get("restricted", False):
                # คำนวณระยะทางจากจุดศูนย์กลางของเขตหวงห้าม
                zone_center = GeoPoint(
                    latitude=zone["center"]["latitude"],
                    longitude=zone["center"]["longitude"]
                )
                
                distance = calculate_distance(zone_center, location)
                
                # แปลงระยะทางเป็นองศา (โดยประมาณ 111 กม. ต่อ 1 องศา)
                distance_deg = distance / 111.0
                
                # ถ้าอยู่ในรัศมีของเขตหวงห้าม
                if distance_deg < zone["radius"]:
                    return True
        
        # ถ้าไม่พบใน hot zones ให้ใช้วิธีการเดิม (วงกลมรอบจุดศูนย์กลาง)
        center = self.border["center"]
        restricted_zone_radius = min(self.border["width"], self.border["height"]) / 6
        
        # Calculate distance from center using geo_utils
        distance = calculate_distance(
            GeoPoint(latitude=center["latitude"], longitude=center["longitude"]),
            location
        )
        
        # Convert from km to degrees (approximately)
        distance_deg = distance / 111.0
        
        return distance_deg < restricted_zone_radius
    
    def _create_drone_mission(self, drone_type: DroneType) -> Dict[str, Any]:
        """
        Create a mission profile for a drone
        
        Args:
            drone_type: Type of the drone
            
        Returns:
            Mission dictionary
        """
        # กำหนดจุดเป้าหมายของภารกิจ
        if random.random() < 0.3:
            # 30% โอกาสที่จะมุ่งไปยังเขตหวงห้าม
            restricted_zones = [zone for zone in self.hot_zones if zone.get("restricted", False)]
            if restricted_zones:
                target_zone = random.choice(restricted_zones)
                target_location = GeoPoint(
                    latitude=target_zone["center"]["latitude"],
                    longitude=target_zone["center"]["longitude"],
                    altitude=random.uniform(50, 500)
                )
                mission_type = "infiltration"
            else:
                # ถ้าไม่มีเขตหวงห้าม ให้ใช้จุดศูนย์กลางของพื้นที่แทน
                target_location = GeoPoint(
                    latitude=self.border["center"]["latitude"],
                    longitude=self.border["center"]["longitude"],
                    altitude=random.uniform(50, 500)
                )
                mission_type = "reconnaissance"
        elif random.random() < 0.5:
            # เลือก hot zone แบบสุ่ม
            target_zone = random.choice(self.hot_zones)
            target_location = GeoPoint(
                latitude=target_zone["center"]["latitude"],
                longitude=target_zone["center"]["longitude"],
                altitude=random.uniform(50, 500)
            )
            mission_type = "patrol" if random.random() < 0.7 else "reconnaissance"
        else:
            # สุ่มจุดทั่วไปในพื้นที่
            target_location = self._generate_random_location(prefer_hot_zones=False)
            mission_type = "patrol"
        
        # กำหนดความเร็วและพฤติกรรมตามประเภทโดรน
        if drone_type == DroneType.MILITARY:
            speed = random.uniform(10, 40)  # เร็วกว่า
            behavior = random.choice(["direct", "evasive", "circling"])
            duration = random.randint(300, 1200)  # 5-20 นาที
        elif drone_type == DroneType.COMMERCIAL:
            speed = random.uniform(5, 15)
            behavior = random.choice(["direct", "hovering", "grid"])
            duration = random.randint(600, 1800)  # 10-30 นาที
        elif drone_type == DroneType.DIY:
            speed = random.uniform(3, 20)
            behavior = random.choice(["direct", "random", "hovering"])
            duration = random.randint(300, 900)  # 5-15 นาที
        else:  # UNKNOWN
            speed = random.uniform(5, 25)
            behavior = random.choice(["direct", "random", "evasive"])
            duration = random.randint(300, 1500)  # 5-25 นาที
        
        return {
            "mission_type": mission_type,
            "target_location": target_location,
            "behavior": behavior,
            "speed": speed,
            "duration": duration,
            "start_time": datetime.now(),
            "waypoints": [],
            "current_waypoint_index": 0,
            "completed": False
        }
    
    def _create_random_drone(self, drone_id: Optional[str] = None, mission: Optional[Dict[str, Any]] = None) -> Drone:
        """
        Create a new random drone
        
        Args:
            drone_id: Optional specific drone ID
            mission: Optional pre-defined mission
            
        Returns:
            New Drone object
        """
        drone_type = self._random_drone_type()
        location = self._generate_random_location()
        
        # Random properties based on drone type
        if drone_type == DroneType.MILITARY:
            signal_strength = random.uniform(30, 70)  # Military drones may have signal dampening
            speed = random.uniform(10, 40)  # Faster
            threat_level = random.choices(
                [ThreatLevel.MEDIUM, ThreatLevel.HIGH, ThreatLevel.CRITICAL],
                weights=[0.6, 0.3, 0.1],
                k=1
            )[0]
            confidence = random.uniform(0.5, 0.8)  # Harder to identify with certainty
            size = random.uniform(2, 5)  # Larger
        elif drone_type == DroneType.COMMERCIAL:
            signal_strength = random.uniform(60, 90)  # Strong commercial signals
            speed = random.uniform(5, 15)
            threat_level = random.choices(
                [ThreatLevel.NONE, ThreatLevel.LOW, ThreatLevel.MEDIUM],
                weights=[0.6, 0.3, 0.1],
                k=1
            )[0]
            confidence = random.uniform(0.7, 0.95)  # Easy to identify
            size = random.uniform(0.3, 1.5)  # Smaller
        elif drone_type == DroneType.DIY:
            signal_strength = random.uniform(50, 85)
            speed = random.uniform(3, 20)
            threat_level = random.choices(
                [ThreatLevel.LOW, ThreatLevel.MEDIUM, ThreatLevel.HIGH],
                weights=[0.5, 0.4, 0.1],
                k=1
            )[0]
            confidence = random.uniform(0.6, 0.9)
            size = random.uniform(0.2, 1.0)
        else:  # UNKNOWN
            signal_strength = random.uniform(20, 60)
            speed = random.uniform(5, 25)
            threat_level = random.choices(
                [ThreatLevel.LOW, ThreatLevel.MEDIUM, ThreatLevel.HIGH],
                weights=[0.3, 0.5, 0.2],
                k=1
            )[0]
            confidence = random.uniform(0.3, 0.7)
            size = random.uniform(0.5, 3)
        
        # Increase threat level if in restricted zone
        if self._is_in_restricted_zone(location):
            threat_levels = list(ThreatLevel)
            current_index = threat_levels.index(threat_level)
            if current_index < len(threat_levels) - 1:
                threat_level = threat_levels[current_index + 1]
        
        # Generate random heading if mission is not provided
        if mission:
            # คำนวณทิศทางที่ต้องบินไปยังเป้าหมาย
            heading = self._calculate_heading_to_target(location, mission["target_location"])
            # ใช้ความเร็วจากภารกิจ
            speed = mission["speed"]
        else:
            heading = random.uniform(0, 360)
        
        # สร้างข้อมูลเมตะดาต้าเพิ่มเติมที่สมจริง
        metadata = {
            "battery": random.uniform(30, 100),
            "frequency": f"{random.uniform(2.4, 5.8):.1f} GHz"
        }
        
        # เพิ่มข้อมูลแบบจำเพาะตามประเภทโดรน
        if drone_type == DroneType.COMMERCIAL:
            manufacturers = ["DJI", "Autel", "Parrot", "Skydio", "Yuneec"]
            models = ["Mavic", "Phantom", "Evo", "Anafi", "Typhoon"]
            
            metadata["model"] = f"{random.choice(manufacturers)} {random.choice(models)} {random.randint(1, 4)}"
            metadata["max_speed"] = f"{random.randint(40, 70)} km/h"
            metadata["camera"] = f"{random.choice(['4K', '1080p', '8K'])} {random.randint(30, 60)}fps"
        
        elif drone_type == DroneType.MILITARY:
            countries = ["Unknown", "Foreign", "Classified"]
            prefixes = ["UAS-", "UAV-", "RECON-", "SURV-"]
            
            metadata["model"] = f"{random.choice(countries)} {random.choice(prefixes)}{random.randint(100, 999)}"
            metadata["signature"] = f"Low Observable" if random.random() < 0.7 else "Standard"
            metadata["range"] = f"{random.randint(50, 200)} km"
        
        elif drone_type == DroneType.DIY:
            frames = ["Quadcopter", "Hexacopter", "Tricopter", "FPV Racer"]
            controllers = ["PixHawk", "ArduPilot", "BetaFlight", "Custom"]
            
            metadata["frame"] = random.choice(frames)
            metadata["controller"] = random.choice(controllers)
            metadata["motors"] = f"{random.choice([3, 4, 6, 8])}x {random.randint(1000, 2500)}KV"
        
        # Generate unique ID if not provided
        if drone_id is None:
            # ใช้รหัสที่มีความหมายมากขึ้น
            type_prefix = drone_type.value[0].upper()
            num_id = random.randint(1000, 9999)
            drone_id = f"{type_prefix}{num_id}"
        
        return Drone(
            id=drone_id,
            location=location,
            type=drone_type,
            signal_strength=signal_strength,
            speed=speed,
            heading=heading,
            threat_level=threat_level,
            estimated_size=size,
            confidence=confidence,
            metadata=metadata
        )
    
    def _calculate_heading_to_target(self, current_location: GeoPoint, target_location: GeoPoint) -> float:
        """
        Calculate heading angle to fly from current location to target
        
        Args:
            current_location: Current drone location
            target_location: Target location
            
        Returns:
            Heading in degrees (0-360, where 0 is North)
        """
        # แปลงพิกัดเป็นเรเดียน
        lat1 = math.radians(current_location.latitude)
        lon1 = math.radians(current_location.longitude)
        lat2 = math.radians(target_location.latitude)
        lon2 = math.radians(target_location.longitude)
        
        # คำนวณความแตกต่างของลองจิจูด
        dlon = lon2 - lon1
        
        # คำนวณมุมทิศทาง (bearing)
        y = math.sin(dlon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        
        # แปลงเป็นองศา
        heading = math.degrees(math.atan2(y, x))
        
        # ปรับให้อยู่ในช่วง 0-360 องศา
        heading = (heading + 360) % 360
        
        return heading
    
    def _ensure_geopoint(self, location: Union[Dict, GeoPoint]) -> GeoPoint:
        """
        Ensure the location is a GeoPoint object
        
        Args:
            location: Location data either as dict or GeoPoint
            
        Returns:
            GeoPoint object
        """
        if isinstance(location, GeoPoint):
            return location
            
        if isinstance(location, dict):
            # Extract values with fallbacks
            latitude = location.get('latitude')
            longitude = location.get('longitude')
            altitude = location.get('altitude')
            
            # Check if we have valid values
            if latitude is not None and longitude is not None:
                return GeoPoint(
                    latitude=latitude,
                    longitude=longitude,
                    altitude=altitude
                )
        
        # If we get here, raise an error
        raise ValueError(f"Could not convert to GeoPoint: {location}")
    
    def _update_drone_mission(self, drone: Drone, mission: Dict[str, Any]) -> Tuple[Drone, bool]:
        """
        Update drone movement based on its mission
        
        Args:
            drone: The drone to update
            mission: The drone's mission
            
        Returns:
            Tuple of (updated_drone, mission_completed)
        """
        # ตรวจสอบว่าภารกิจเสร็จสิ้นหรือไม่ (เวลาผ่านไปนานเกินกำหนด)
        mission_duration = (datetime.now() - mission["start_time"]).total_seconds()
        if mission_duration > mission["duration"]:
            return drone, True
        
        # พฤติกรรมการบินตามที่กำหนดไว้
        behavior = mission["behavior"]
        
        # Ensure location is a GeoPoint object
        location = self._ensure_geopoint(drone.location)
        
        if behavior == "direct":
            # บินตรงไปยังเป้าหมาย
            target = mission["target_location"]
            heading = self._calculate_heading_to_target(location, target)
            
            # ปรับมุมการบินให้เล็กน้อย
            heading_noise = random.uniform(-5, 5)
            heading = (heading + heading_noise) % 360
            
            # คำนวณตำแหน่งใหม่
            new_location = calculate_new_position(
                location,
                heading,
                drone.speed,
                self.update_interval
            )
            
            # คำนวณระยะทางไปยังเป้าหมาย
            distance_to_target = calculate_distance(new_location, target)
            
            # ถ้าถึงเป้าหมายแล้ว ให้เปลี่ยนพฤติกรรมหรือกำหนดเป้าหมายใหม่
            if distance_to_target < 0.05:  # ประมาณ 5.5 กิโลเมตร
                if mission["mission_type"] == "patrol":
                    # เปลี่ยนไปเป็นบินวนรอบเป้าหมาย
                    mission["behavior"] = "circling"
                elif mission["mission_type"] == "infiltration":
                    # ภารกิจแทรกซึม - เริ่มบินวนรอบเป้าหมาย
                    mission["behavior"] = "hovering"
                else:
                    # ถือว่าภารกิจเสร็จสิ้น
                    return drone, True
            
            # สร้างโดรนที่อัปเดตแล้ว
            updated_drone = drone.copy(
                update={
                    "location": new_location,
                    "timestamp": datetime.now(),
                    "heading": heading
                }
            )
            
        elif behavior == "circling":
            # บินวนรอบเป้าหมาย
            target = mission["target_location"]
            
            # คำนวณมุมการบินวนรอบเป้าหมาย
            # เริ่มจากการคำนวณระยะทางและมุมปัจจุบันจากเป้าหมาย
            distance_to_target = calculate_distance(location, target)
            
            # ถ้าอยู่ไกลเกินไป ให้บินเข้าหาเป้าหมายก่อน
            if distance_to_target > 0.03:  # ประมาณ 3.3 กิโลเมตร
                heading = self._calculate_heading_to_target(location, target)
            else:
                # คำนวณมุมปัจจุบัน
                current_angle = self._calculate_heading_to_target(target, location)
                # เพิ่มมุม 90 องศาเพื่อบินวงกลม (ตามเข็มนาฬิกา)
                heading = (current_angle + 90) % 360
            
            # ปรับมุมให้มีความแปรปรวนเล็กน้อย
            heading_noise = random.uniform(-3, 3)
            heading = (heading + heading_noise) % 360
            
            # คำนวณตำแหน่งใหม่
            new_location = calculate_new_position(
                location,
                heading,
                drone.speed,
                self.update_interval
            )
            
            # สร้างโดรนที่อัปเดตแล้ว
            updated_drone = drone.copy(
                update={
                    "location": new_location,
                    "timestamp": datetime.now(),
                    "heading": heading
                }
            )
            
        elif behavior == "hovering":
            # บินอยู่กับที่หรือเคลื่อนที่เล็กน้อย
            # สร้างการเคลื่อนที่สุ่มเล็กน้อยเพื่อจำลองการลอยนิ่ง ๆ
            latitude_noise = random.uniform(-0.0001, 0.0001)
            longitude_noise = random.uniform(-0.0001, 0.0001)
            altitude_noise = random.uniform(-5, 5)
            
            # Get current values ensuring they are valid
            current_altitude = location.altitude if location.altitude is not None else 100
            
            # Create new location
            new_location = GeoPoint(
                latitude=location.latitude + latitude_noise,
                longitude=location.longitude + longitude_noise,
                altitude=current_altitude + altitude_noise
            )
            
            # ลดความเร็วลงเนื่องจากกำลังลอยนิ่ง ๆ
            new_speed = max(0.5, min(3.0, drone.speed * 0.5))
            
            # สุ่มมุมการหัน
            heading_noise = random.uniform(-30, 30)
            new_heading = (drone.heading + heading_noise) % 360
            
            updated_drone = drone.copy(
                update={
                    "location": new_location,
                    "timestamp": datetime.now(),
                    "heading": new_heading,
                    "speed": new_speed
                }
            )
            
        elif behavior == "evasive":
            # เปลี่ยนทิศทางและความเร็วเพื่อหลบหลีกการตรวจจับ
            # สุ่มการเปลี่ยนแปลงความเร็ว
            speed_change = random.uniform(-3, 3)
            new_speed = max(5, min(40, drone.speed + speed_change))
            
            # สุ่มการเปลี่ยนแปลงทิศทาง
            # โดรนที่มีพฤติกรรมหลบหลีกจะเปลี่ยนทิศทางบ่อยและมากกว่า
            heading_change = random.uniform(-45, 45)
            new_heading = (drone.heading + heading_change) % 360
            
            # คำนวณตำแหน่งใหม่
            new_location = calculate_new_position(
                location,
                new_heading,
                new_speed,
                self.update_interval
            )
            
            # ตรวจสอบว่ายังอยู่ในพื้นที่ชายแดนหรือไม่
            if not is_point_in_border(new_location, self.border):
                # ถ้าออกนอกพื้นที่ ให้เปลี่ยนทิศทางกลับ
                new_heading = (new_heading + 180) % 360
                new_location = calculate_new_position(
                    location,
                    new_heading,
                    new_speed,
                    self.update_interval
                )
            
            # ถ้าอยู่ไกลจากเป้าหมายมากเกินไป ให้ปรับทิศทางกลับมาบ้าง
            target = mission["target_location"]
            distance_to_target = calculate_distance(new_location, target)
            
            if distance_to_target > 0.1:  # ประมาณ 11 กิโลเมตร
                # มีโอกาสที่จะปรับทิศทางกลับไปยังเป้าหมาย
                if random.random() < 0.3:
                    target_heading = self._calculate_heading_to_target(new_location, target)
                    # ผสมทิศทางปัจจุบันกับทิศทางไปยังเป้าหมาย
                    new_heading = (0.7 * new_heading + 0.3 * target_heading) % 360
                    new_location = calculate_new_position(
                        location,
                        new_heading,
                        new_speed,
                        self.update_interval
                    )
            
            updated_drone = drone.copy(
                update={
                    "location": new_location,
                    "timestamp": datetime.now(),
                    "heading": new_heading,
                    "speed": new_speed
                }
            )
            
        elif behavior == "random":
            # เคลื่อนที่แบบสุ่มแต่ยังคงอยู่ในพื้นที่
            # สุ่มการเปลี่ยนแปลงทิศทาง
            if random.random() < 0.2:  # 20% โอกาสที่จะเปลี่ยนทิศทางอย่างมีนัยสำคัญ
                heading_change = random.uniform(-90, 90)
            else:
                heading_change = random.uniform(-15, 15)
                
            new_heading = (drone.heading + heading_change) % 360
            
            # สุ่มการเปลี่ยนแปลงความเร็ว
            if random.random() < 0.1:  # 10% โอกาสที่จะเปลี่ยนความเร็วอย่างมีนัยสำคัญ
                speed_change = random.uniform(-5, 5)
            else:
                speed_change = random.uniform(-1, 1)
                
            new_speed = max(1, min(25, drone.speed + speed_change))
            
            # คำนวณตำแหน่งใหม่
            new_location = calculate_new_position(
                location,
                new_heading,
                new_speed,
                self.update_interval
            )
            
            # ตรวจสอบว่ายังอยู่ในพื้นที่ชายแดนหรือไม่
            if not is_point_in_border(new_location, self.border):
                # ถ้าออกนอกพื้นที่ ให้เปลี่ยนทิศทางกลับ
                new_heading = (new_heading + 180) % 360
                new_location = calculate_new_position(
                    location,
                    new_heading,
                    new_speed,
                    self.update_interval
                )
            
            updated_drone = drone.copy(
                update={
                    "location": new_location,
                    "timestamp": datetime.now(),
                    "heading": new_heading,
                    "speed": new_speed
                }
            )
            
        elif behavior == "grid":
            # บินในรูปแบบตารางเพื่อสำรวจพื้นที่
            # ตรวจสอบว่ามีเส้นทางการบินกำหนดไว้แล้วหรือไม่
            if not mission.get("waypoints"):
                # สร้างเส้นทางการบินแบบตาราง
                center = mission["target_location"]
                grid_size = 0.02  # ประมาณ 2.2 กิโลเมตร
                rows = 3
                cols = 3
                
                waypoints = []
                for row in range(rows):
                    # สลับทิศทางในแต่ละแถว (บินแบบซิกแซก)
                    col_range = range(cols) if row % 2 == 0 else range(cols - 1, -1, -1)
                    for col in col_range:
                        lat_offset = (row - rows // 2) * grid_size
                        lon_offset = (col - cols // 2) * grid_size
                        
                        waypoints.append(GeoPoint(
                            latitude=center.latitude + lat_offset,
                            longitude=center.longitude + lon_offset,
                            altitude=center.altitude if center.altitude else random.uniform(50, 300)
                        ))
                
                mission["waypoints"] = waypoints
                mission["current_waypoint_index"] = 0
            
            # ดึงเป้าหมายปัจจุบัน
            current_waypoint_index = mission["current_waypoint_index"]
            
            if current_waypoint_index >= len(mission["waypoints"]):
                # ถ้าเสร็จสิ้นทุกจุดแล้ว ให้เริ่มใหม่หรือเปลี่ยนพฤติกรรม
                if random.random() < 0.5:
                    mission["current_waypoint_index"] = 0
                else:
                    mission["behavior"] = "hovering"
                    return drone, False
            
            target = mission["waypoints"][current_waypoint_index]
            
            # คำนวณทิศทางไปยังเป้าหมาย
            heading = self._calculate_heading_to_target(location, target)
            
            # คำนวณตำแหน่งใหม่
            new_location = calculate_new_position(
                location,
                heading,
                drone.speed,
                self.update_interval
            )
            
            # ตรวจสอบว่าถึงเป้าหมายหรือยัง
            distance_to_waypoint = calculate_distance(new_location, target)
            
            if distance_to_waypoint < 0.01:  # ประมาณ 1.1 กิโลเมตร
                # ถ้าถึงเป้าหมายแล้ว ให้ไปยังจุดต่อไป
                mission["current_waypoint_index"] += 1
            
            updated_drone = drone.copy(
                update={
                    "location": new_location,
                    "timestamp": datetime.now(),
                    "heading": heading
                }
            )
            
        else:
            # กรณีไม่รู้จักพฤติกรรม ให้ใช้การเคลื่อนที่แบบปกติ
            new_location = calculate_new_position(
                location,
                drone.heading,
                drone.speed,
                self.update_interval
            )
            
            # ตรวจสอบว่ายังอยู่ในพื้นที่ชายแดนหรือไม่
            if not is_point_in_border(new_location, self.border):
                # ถ้าออกนอกพื้นที่ ให้เปลี่ยนทิศทางกลับ
                new_heading = (drone.heading + 180) % 360
                new_location = calculate_new_position(
                    location,
                    new_heading,
                    drone.speed,
                    self.update_interval
                )
            else:
                new_heading = drone.heading
            
            updated_drone = drone.copy(
                update={
                    "location": new_location,
                    "timestamp": datetime.now(),
                    "heading": new_heading
                }
            )
        
        # ตรวจสอบว่าอยู่ในเขตหวงห้ามหรือไม่ และปรับระดับภัยคุกคามตามความเหมาะสม
        if self._is_in_restricted_zone(updated_drone.location):
            threat_levels = list(ThreatLevel)
            current_index = threat_levels.index(updated_drone.threat_level)
            
            # ปรับระดับภัยคุกคาม โดยมีโอกาสที่จะเพิ่มขึ้น
            if random.random() < 0.3 and current_index < len(threat_levels) - 1:
                updated_drone = updated_drone.copy(
                    update={"threat_level": threat_levels[current_index + 1]}
                )
        
        return updated_drone, False
    
    def _update_drone_position(self, drone: Drone) -> Drone:
        """
        Update a drone's position based on its mission or simple movement
        
        Args:
            drone: The drone to update
            
        Returns:
            Updated drone
        """
        # ตรวจสอบว่าโดรนนี้มีภารกิจหรือไม่
        drone_id = drone.id
        
        if drone_id in self.drone_missions:
            mission = self.drone_missions[drone_id]
            
            # อัปเดตโดรนตามภารกิจ
            updated_drone, mission_completed = self._update_drone_mission(drone, mission)
            
            # ถ้าภารกิจเสร็จสิ้น ให้ลบออกจากรายการ
            if mission_completed:
                del self.drone_missions[drone_id]
                
                # สร้างภารกิจใหม่
                if random.random() < 0.7:  # 70% โอกาสที่จะมีภารกิจใหม่
                    self.drone_missions[drone_id] = self._create_drone_mission(drone.type)
            
            return updated_drone
        else:
            # ถ้าไม่มีภารกิจ ให้ใช้การเคลื่อนที่แบบง่าย
            if drone.speed is None or drone.heading is None:
                return drone
            
            # Ensure location is a GeoPoint object
            location = self._ensure_geopoint(drone.location)
            
            # คำนวณตำแหน่งใหม่
            new_location = calculate_new_position(
                location,
                drone.heading,
                drone.speed,
                self.update_interval
            )
            
            # ตรวจสอบว่ายังอยู่ในพื้นที่ชายแดนหรือไม่
            if not is_point_in_border(new_location, self.border):
                # ถ้าออกนอกพื้นที่ ให้เปลี่ยนทิศทางกลับ
                new_heading = (drone.heading + 180) % 360
            else:
                # มีโอกาสที่จะเปลี่ยนทิศทางเล็กน้อย
                heading_change = random.uniform(-15, 15) if random.random() < 0.3 else 0
                new_heading = (drone.heading + heading_change) % 360
            
            # คำนวณตำแหน่งใหม่อีกครั้ง
            new_location = calculate_new_position(
                location,
                new_heading,
                drone.speed,
                self.update_interval
            )
            
            # มีโอกาสที่จะเปลี่ยนความเร็วเล็กน้อย
            speed_change = random.uniform(-1, 1) if random.random() < 0.3 else 0
            new_speed = max(0, drone.speed + speed_change)
            
            # สร้างความแปรปรวนเล็กน้อยในความแรงของสัญญาณ
            signal_change = random.uniform(-5, 5) if random.random() < 0.2 else 0
            new_signal = max(0, min(100, drone.signal_strength + signal_change))
            
            # สร้างโดรนที่อัปเดตแล้ว
            updated_drone = drone.copy(
                update={
                    "location": new_location,
                    "timestamp": datetime.now(),
                    "heading": new_heading,
                    "speed": new_speed,
                    "signal_strength": new_signal
                }
            )
            
            # มีโอกาสที่จะสร้างภารกิจใหม่
            if random.random() < 0.05:  # 5% โอกาสต่อการอัปเดต
                self.drone_missions[drone_id] = self._create_drone_mission(drone.type)
            
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
    
    def apply_countermeasure_effects(self):
        """Apply effects of active countermeasures to simulated drones"""
        try:
            for drone_id, drone in list(self.drones.items()):
                # Check for jamming effects
                drone_data = drone.dict()
                updated_data = jammer.simulate_jamming_effect(drone_data)
                
                # Check for takeover effects
                if drone_id in takeover.current_targets and takeover.current_targets[drone_id]["active"]:
                    updated_data = takeover.simulate_takeover_effect(updated_data)
                
                # Apply updates to drone
                for key, value in updated_data.items():
                    if hasattr(drone, key):
                        setattr(drone, key, value)
                
                # Generate alerts for countermeasures if needed
                if updated_data.get("is_jammed") and not drone_data.get("is_jammed"):
                    self._create_countermeasure_alert(drone, "signal_interference", "Drone signal being jammed")
                
                if updated_data.get("takeover_status") == "controlled" and drone_data.get("takeover_status") != "controlled":
                    self._create_countermeasure_alert(drone, "unauthorized_flight", "Drone under external control")
        except Exception as e:
            logger.error(f"Error applying countermeasure effects: {e}")

    def _create_countermeasure_alert(self, drone, alert_type, description):
        """Create an alert for countermeasure effects"""
        from app.core.models import Alert, AlertType
        
        alert = Alert(
            drone_id=drone.id,
            alert_type=getattr(AlertType, alert_type.upper()),
            location=drone.location,
            description=description,
            threat_level=drone.threat_level
        )
        self.alerts.append(alert)
        return alert

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
            
            # สร้างภารกิจสำหรับโดรนแต่ละตัวด้วยโอกาส 80%
            if random.random() < 0.8:
                self.drone_missions[drone.id] = self._create_drone_mission(drone.type)
        
        try:
            while True:
                # Update all drone positions
                for drone_id, drone in list(self.drones.items()):
                    # Update position
                    updated_drone = self._update_drone_position(drone)
                    
                    # Analyze drone data using DroneService
                    updated_drone, alert = await DroneService.analyze_drone_data(updated_drone)
                    
                    # Update drone in simulator
                    self.drones[drone_id] = updated_drone
                    
                    # Check for alerts from position update
                    position_alert = self._check_for_alerts(updated_drone)
                    if position_alert:
                        self.alerts.append(position_alert)
                        # Broadcast alert to clients
                        alert_data = position_alert.dict()
                        alert_data["timestamp"] = position_alert.timestamp.isoformat()
                        await connection_manager.broadcast({
                            "type": "alert",
                            "data": alert_data
                        })
                    
                    # Add alert from analysis if exists
                    if alert:
                        self.alerts.append(alert)
                
                # Apply countermeasure effects to drones
                self.apply_countermeasure_effects()
                
                # Occasionally add or remove drones to simulate new detections/lost signals
                if random.random() < 0.05:  # 5% chance each update
                    if random.random() < 0.7 and len(self.drones) < self.num_drones + 3:
                        # Add a new drone
                        new_drone = self._create_random_drone()
                        self.drones[new_drone.id] = new_drone
                        
                        # 50% chance to give the new drone a mission
                        if random.random() < 0.5:
                            self.drone_missions[new_drone.id] = self._create_drone_mission(new_drone.type)
                        
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
                        
                        # ลบภารกิจถ้ามี
                        if drone_id in self.drone_missions:
                            del self.drone_missions[drone_id]
                
                # Calculate statistics using DroneService
                stats = DroneService.calculate_drone_statistics(list(self.drones.values()))
                
                # Broadcast current drone positions to all clients
                drone_data = [drone.to_dict() for drone in self.drones.values()]
                await connection_manager.broadcast({
                    "type": "drones",
                    "data": drone_data
                })
                
                # Broadcast countermeasures status if available
                try:
                    countermeasures_status = {
                        "jammers": jammer.get_active_jammers(),
                        "takeovers": takeover.get_active_takeovers(),
                        "physical": physical.get_active_operations()
                    }
                    await connection_manager.broadcast({
                        "type": "countermeasures_status",
                        "data": countermeasures_status
                    })
                except Exception as cm_err:
                    logger.error(f"Error broadcasting countermeasures status: {cm_err}")
                
                # Wait for next update
                await asyncio.sleep(self.update_interval)
                
        except asyncio.CancelledError:
            logger.info("Drone simulator task cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in drone simulator: {e}", exc_info=True)
            raise