"""
Countermeasure system for drone detection and response
"""
import logging
from app.countermeasures.jammer import DroneJammer
from app.countermeasures.takeover import DroneTakeover
from app.countermeasures.physical import PhysicalCountermeasure

# Configure logging
logger = logging.getLogger(__name__)

# Create singleton instances
jammer = DroneJammer()
takeover = DroneTakeover()
physical = PhysicalCountermeasure()

logger.info("Countermeasure systems initialized")

__all__ = ["jammer", "takeover", "physical"]