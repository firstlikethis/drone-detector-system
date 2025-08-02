"""
Configuration settings for the Drone Detection System
"""
import os
from typing import Dict, Any, Optional

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # API settings
    API_PREFIX: str = "/api"
    API_VERSION: str = "v1"
    API_TITLE: str = "Drone Detection System API"
    API_DESCRIPTION: str = "Backend API for Drone Detection and Radar System"
    API_VERSION_STR: str = "0.1.0"
    
    # CORS settings
    CORS_ORIGINS: str = "*"  # In production, set to specific origins
    
    # Simulator settings
    SIM_DEFAULT_DRONES: int = 5
    SIM_UPDATE_INTERVAL: float = 1.0  # seconds
    
    # Border defaults (Thailand-Myanmar border area example - Mae Sot)
    BORDER_CENTER_LAT: float = 16.7769
    BORDER_CENTER_LON: float = 98.9761
    BORDER_WIDTH: float = 0.1  # degrees (~10km)
    BORDER_HEIGHT: float = 0.1  # degrees (~10km)
    BORDER_ROTATION: float = 0  # degrees
    
    # Hardware integration settings
    ENABLE_HARDWARE: bool = False
    RTL_SDR_DEVICE_INDEX: int = 0
    RTL_SDR_SAMPLE_RATE: int = 2400000
    RTL_SDR_CENTER_FREQ: int = 1090000000  # 1090 MHz for ADS-B
    
    # Default border area configuration
    @property
    def default_border(self) -> Dict[str, Any]:
        """Get the default border configuration"""
        return {
            "center": {
                "latitude": self.BORDER_CENTER_LAT,
                "longitude": self.BORDER_CENTER_LON
            },
            "width": self.BORDER_WIDTH,
            "height": self.BORDER_HEIGHT,
            "rotation": self.BORDER_ROTATION
        }
    
    class Config:
        """Pydantic config"""
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()