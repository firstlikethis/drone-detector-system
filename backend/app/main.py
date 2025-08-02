"""
Drone Detection System - FastAPI Backend
Main application entry point
"""
import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import drones, system
from app.simulator.drone_simulator import DroneSimulator
from app.core.models import ConnectionManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create connection manager for WebSockets
manager = ConnectionManager()

# Global simulator instance
drone_simulator = DroneSimulator()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the drone simulator background task
    logger.info("Starting drone simulator...")
    simulator_task = asyncio.create_task(drone_simulator.run_simulation(manager))
    
    yield  # Run application
    
    # Shutdown: Cancel the simulator task
    logger.info("Shutting down drone simulator...")
    simulator_task.cancel()
    try:
        await simulator_task
    except asyncio.CancelledError:
        logger.info("Drone simulator stopped successfully")

# Create FastAPI application
app = FastAPI(
    title="Drone Detection System API",
    description="Backend API for Drone Detection and Radar System",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(drones.router, prefix="/api", tags=["drones"])
app.include_router(system.router, prefix="/api", tags=["system"])

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "drone-detection-system",
        "version": "0.1.0"
    }

@app.websocket("/ws/drones")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time drone data streaming"""
    await manager.connect(websocket)
    try:
        while True:
            # Wait for any messages from client
            # This is mainly to detect disconnections
            data = await websocket.receive_text()
            logger.debug(f"Received message: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected from WebSocket")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)