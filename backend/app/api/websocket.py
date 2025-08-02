"""
WebSocket handlers for real-time drone data streaming
"""
import json
import logging
from typing import List, Dict, Any

from fastapi import WebSocket, WebSocketDisconnect
from app.core.globals import connection_manager

# Configure logging
logger = logging.getLogger(__name__)

async def register_websocket(websocket: WebSocket):
    """
    Register a new WebSocket connection
    """
    await connection_manager.connect(websocket)
    logger.info(f"Client connected to WebSocket (total: {len(connection_manager.active_connections)})")

async def unregister_websocket(websocket: WebSocket):
    """
    Unregister a WebSocket connection
    """
    connection_manager.disconnect(websocket)
    logger.info(f"Client disconnected from WebSocket (remaining: {len(connection_manager.active_connections)})")

async def broadcast_drones(drones: List[Dict[str, Any]]):
    """
    Broadcast drone data to all connected clients
    """
    if not connection_manager.active_connections:
        return
        
    # Create message with drone data
    message = {
        "type": "drones",
        "data": drones
    }
    
    # Broadcast to all clients
    await connection_manager.broadcast(message)

async def broadcast_alert(alert: Dict[str, Any]):
    """
    Broadcast a new alert to all connected clients
    """
    if not connection_manager.active_connections:
        return
        
    # Create message with alert data
    message = {
        "type": "alert",
        "data": alert
    }
    
    # Broadcast to all clients
    await connection_manager.broadcast(message)

async def broadcast_system_status(status: Dict[str, Any]):
    """
    Broadcast system status to all connected clients
    """
    if not connection_manager.active_connections:
        return
        
    # Create message with system status
    message = {
        "type": "system_status",
        "data": status
    }
    
    # Broadcast to all clients
    await connection_manager.broadcast(message)