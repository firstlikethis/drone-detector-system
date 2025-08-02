# Import route modules for proper discovery
from app.api.routes import drones
from app.api.routes import system
from app.api.routes import countermeasures

__all__ = ["drones", "system", "countermeasures"]