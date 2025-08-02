"""
Core data models using Pydantic
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from fastapi import WebSocket, WebSocketDisconnect
import json

# Enum definitions
class DroneType(str, Enum):
    UNKNOWN = "unknown"
    COMMERCIAL = "commercial"
    MILITARY = "military"
    DIY = "diy"

class ThreatLevel(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertType(str, Enum):
    BORDER_VIOLATION = "border_violation"
    RESTRICTED_ZONE = "restricted_zone"
    SIGNAL_INTERFERENCE = "signal_interference"
    UNAUTHORIZED_FLIGHT = "unauthorized_flight"
    NEW_DETECTION = "new_detection"

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                # Handle disconnection during broadcast
                self.active_connections.remove(connection)
            except Exception as e:
                print(f"Error broadcasting message: {e}")

# Core data models
class GeoPoint(BaseModel):
    """Geographic coordinates"""
    latitude: float
    longitude: float
    altitude: Optional[float] = None

    @validator('latitude')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v

    @validator('longitude')
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError('Longitude must be between -180 and 180')
        return v

class Drone(BaseModel):
    """Drone detection data model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)
    location: GeoPoint
    type: DroneType = DroneType.UNKNOWN
    signal_strength: float = Field(..., ge=0, le=100)  # Percentage 0-100
    speed: Optional[float] = None  # In m/s
    heading: Optional[float] = None  # Degrees (0-360)
    threat_level: ThreatLevel = ThreatLevel.NONE
    estimated_size: Optional[float] = None  # In meters
    confidence: float = Field(..., ge=0, le=1.0)  # Detection confidence 0-1
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self):
        """Convert to dictionary with datetime formatting"""
        data = self.dict()
        data["timestamp"] = self.timestamp.isoformat()
        return data

class Alert(BaseModel):
    """Alert notification model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)
    drone_id: str
    alert_type: AlertType
    location: GeoPoint
    description: str
    threat_level: ThreatLevel
    is_acknowledged: bool = False