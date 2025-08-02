"""
Countermeasure system for drone detection and response
"""

from app.countermeasures.jammer import DroneJammer
from app.countermeasures.takeover import DroneTakeover
from app.countermeasures.physical import PhysicalCountermeasure

# Create singleton instances
jammer = DroneJammer()
takeover = DroneTakeover()
physical = PhysicalCountermeasure()

__all__ = ["jammer", "takeover", "physical"]