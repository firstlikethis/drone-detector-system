"""
Global variables and instances used across the application
"""
from app.core.models import ConnectionManager
from app.simulator.drone_simulator import DroneSimulator

# Global instance of connection manager for WebSockets
connection_manager = ConnectionManager()

# Global instance of drone simulator
drone_simulator = DroneSimulator()