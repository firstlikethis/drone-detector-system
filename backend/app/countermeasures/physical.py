"""
Physical countermeasures for drone defense
Includes net guns, drone capture systems, and other physical interception methods
"""
import logging
import time
import random
import threading
from typing import Dict, List, Optional, Tuple, Union, Any
from enum import Enum
import math

logger = logging.getLogger(__name__)

class CaptureMethod(str, Enum):
    """Methods of physical drone capture"""
    NET_GUN = "net_gun"  # Net-firing device
    CAPTURE_DRONE = "capture_drone"  # Drone equipped with capture mechanism
    INTERCEPTOR = "interceptor"  # Fast interceptor drone
    LAUNCHER = "launcher"  # Net or projectile launcher

class PhysicalCountermeasure:
    """
    System for physical countermeasures against unauthorized drones
    
    This module controls hardware devices that can physically capture or neutralize drones:
    1. Net guns and launchers
    2. Capture drones (drones equipped with nets or other capture mechanisms)
    3. Interceptor drones (fast drones that can physically intercept targets)
    4. Fixed countermeasure systems
    """
    
    def __init__(self):
        """Initialize the physical countermeasure system"""
        self.active = False
        self.hardware_connected = False
        self.devices = {}  # Available countermeasure devices
        self.active_countermeasures = {}  # Tracking active countermeasure operations
        self.countermeasure_threads = {}
        
        # Equipment status
        self.equipment_status = {
            CaptureMethod.NET_GUN: {
                "available": False,
                "ready": False,
                "range_meters": 80,
                "battery_percent": 100,
                "ammo_count": 5,
                "last_maintenance": time.time() - 86400 * 30  # 30 days ago
            },
            CaptureMethod.CAPTURE_DRONE: {
                "available": False,
                "ready": False,
                "range_meters": 500,
                "battery_percent": 90,
                "status": "standby",
                "position": (0, 0, 0)  # lat, lon, alt
            },
            CaptureMethod.INTERCEPTOR: {
                "available": False,
                "ready": False,
                "range_meters": 800,
                "battery_percent": 85,
                "status": "standby",
                "position": (0, 0, 0)  # lat, lon, alt
            },
            CaptureMethod.LAUNCHER: {
                "available": False,
                "ready": False,
                "range_meters": 150,
                "ammo_count": 3,
                "status": "standby"
            }
        }
        
        logger.info("Physical countermeasure system initialized")
    
    def connect_hardware(
        self, 
        method: Union[CaptureMethod, str],
        device_id: str = None
    ) -> Dict:
        """
        Connect to physical countermeasure hardware
        
        Args:
            method: Type of countermeasure device to connect
            device_id: Optional device ID or path
            
        Returns:
            Status information
        """
        try:
            # Validate method
            if isinstance(method, str):
                method = CaptureMethod(method)
            
            # In a real implementation, this would connect to actual hardware
            # Example: self.devices[method] = CountermeasureDevice(device_id, method)
            
            # Simulation mode - mark device as available and ready
            self.equipment_status[method]["available"] = True
            self.equipment_status[method]["ready"] = True
            
            # Set random status values for simulation
            if method == CaptureMethod.NET_GUN:
                self.equipment_status[method]["battery_percent"] = random.randint(70, 100)
                self.equipment_status[method]["ammo_count"] = random.randint(1, 5)
            
            elif method in (CaptureMethod.CAPTURE_DRONE, CaptureMethod.INTERCEPTOR):
                self.equipment_status[method]["battery_percent"] = random.randint(60, 100)
                self.equipment_status[method]["status"] = "ready"
                
                # Random position near operator (for simulation)
                self.equipment_status[method]["position"] = (
                    random.uniform(16.77, 16.78),  # latitude
                    random.uniform(98.97, 98.98),  # longitude
                    random.uniform(10, 50)  # altitude
                )
            
            elif method == CaptureMethod.LAUNCHER:
                self.equipment_status[method]["ammo_count"] = random.randint(1, 3)
                self.equipment_status[method]["status"] = "ready"
            
            self.hardware_connected = True
            
            logger.info(f"Connected to {method.value} device (simulated)")
            
            return {
                "status": "connected",
                "method": method.value,
                "equipment_status": self.equipment_status[method]
            }
            
        except Exception as e:
            logger.error(f"Failed to connect to {method} device: {e}")
            
            if isinstance(method, CaptureMethod):
                self.equipment_status[method]["available"] = False
                self.equipment_status[method]["ready"] = False
            
            return {
                "status": "error",
                "message": f"Failed to connect: {str(e)}",
                "method": method.value if isinstance(method, CaptureMethod) else str(method)
            }
    
    def deploy_countermeasure(
        self,
        drone_id: str,
        method: Union[CaptureMethod, str],
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict:
        """
        Deploy a physical countermeasure against a drone
        
        Args:
            drone_id: ID of the target drone
            method: Type of countermeasure to deploy
            parameters: Optional parameters for the countermeasure
            
        Returns:
            Status information
        """
        # Validate method
        try:
            if isinstance(method, str):
                method = CaptureMethod(method)
        except ValueError as e:
            return {
                "status": "error",
                "message": f"Invalid method: {e}",
                "drone_id": drone_id
            }
        
        # Check if method is available and ready
        if not self.equipment_status[method]["available"]:
            return {
                "status": "error",
                "message": f"{method.value} is not available",
                "drone_id": drone_id
            }
        
        if not self.equipment_status[method]["ready"]:
            return {
                "status": "error",
                "message": f"{method.value} is not ready",
                "drone_id": drone_id
            }
        
        # Initialize parameters
        if parameters is None:
            parameters = {}
        
        # Generate operation ID
        operation_id = f"{method.value}_{drone_id}_{int(time.time())}"
        
        # Calculate estimated time to target
        time_to_target = self._calculate_time_to_target(drone_id, method)
        
        # Record countermeasure deployment
        deployment_info = {
            "operation_id": operation_id,
            "drone_id": drone_id,
            "method": method,
            "parameters": parameters,
            "start_time": time.time(),
            "time_to_target": time_to_target,
            "active": True,
            "status": "deploying",
            "success_probability": self._calculate_success_probability(drone_id, method)
        }
        
        self.active_countermeasures[operation_id] = deployment_info
        self.active = True
        
        logger.info(
            f"Deploying {method.value} against drone {drone_id}, "
            f"ETA {time_to_target:.1f} seconds"
        )
        
        # Update equipment status based on method
        self._update_equipment_status_on_deploy(method)
        
        # Start a thread to simulate countermeasure operation
        timer = threading.Timer(
            time_to_target,
            lambda: self._complete_countermeasure(operation_id)
        )
        timer.daemon = True
        timer.start()
        self.countermeasure_threads[operation_id] = timer
        
        return {
            "status": "deploying",
            "operation_id": operation_id,
            "drone_id": drone_id,
            "method": method.value,
            "time_to_target": time_to_target,
            "estimated_success": deployment_info["success_probability"],
            "equipment_status": self.equipment_status[method]
        }
    
    def abort_countermeasure(self, operation_id: str) -> Dict:
        """
        Abort an active countermeasure operation
        
        Args:
            operation_id: ID of the countermeasure operation
            
        Returns:
            Status information
        """
        if operation_id in self.active_countermeasures:
            deployment_info = self.active_countermeasures[operation_id]
            deployment_info["active"] = False
            deployment_info["status"] = "aborted"
            
            # Calculate duration
            start_time = deployment_info["start_time"]
            operation_duration = time.time() - start_time
            
            # Cancel timer thread if exists
            if operation_id in self.countermeasure_threads:
                self.countermeasure_threads[operation_id].cancel()
                del self.countermeasure_threads[operation_id]
            
            logger.info(
                f"Aborted {deployment_info['method'].value} operation "
                f"against drone {deployment_info['drone_id']} "
                f"after {operation_duration:.2f} seconds"
            )
            
            # Update active status if no more operations are running
            if not any(cm["active"] for cm in self.active_countermeasures.values()):
                self.active = False
            
            return {
                "status": "aborted",
                "operation_id": operation_id,
                "drone_id": deployment_info["drone_id"],
                "method": deployment_info["method"].value,
                "duration": operation_duration
            }
        else:
            return {
                "status": "error",
                "message": f"No active operation with ID {operation_id}",
                "operation_id": operation_id
            }
    
    def get_equipment_status(self, method: Optional[Union[CaptureMethod, str]] = None) -> Dict:
        """
        Get status of countermeasure equipment
        
        Args:
            method: Optional specific method to check
            
        Returns:
            Equipment status information
        """
        # If method specified, return only that equipment's status
        if method:
            try:
                if isinstance(method, str):
                    method = CaptureMethod(method)
                
                return {
                    "status": "success",
                    "method": method.value,
                    "equipment": self.equipment_status[method]
                }
            except (ValueError, KeyError) as e:
                return {
                    "status": "error",
                    "message": f"Invalid method: {e}",
                    "method": str(method)
                }
        
        # Return all equipment status
        return {
            "status": "success",
            "hardware_connected": self.hardware_connected,
            "equipment": self.equipment_status
        }
    
    def get_active_operations(self) -> Dict:
        """
        Get information about all active countermeasure operations
        
        Returns:
            Dictionary of active operations and their status
        """
        return {
            "active": self.active,
            "operations": self.active_countermeasures,
            "hardware_connected": self.hardware_connected
        }
    
    def _calculate_time_to_target(self, drone_id: str, method: CaptureMethod) -> float:
        """
        Calculate estimated time for countermeasure to reach target
        
        Args:
            drone_id: ID of the target drone
            method: Countermeasure method
            
        Returns:
            Estimated time in seconds
        """
        # In a real system, this would calculate based on drone position, speed, etc.
        # For simulation, use different times for different methods
        
        if method == CaptureMethod.NET_GUN:
            # Net guns are nearly instant
            return random.uniform(0.5, 1.5)
        
        elif method == CaptureMethod.LAUNCHER:
            # Launchers take a short time
            return random.uniform(1.0, 3.0)
        
        elif method == CaptureMethod.CAPTURE_DRONE:
            # Capture drones need to fly to target
            return random.uniform(10.0, 25.0)
        
        elif method == CaptureMethod.INTERCEPTOR:
            # Interceptors are faster than capture drones
            return random.uniform(5.0, 15.0)
        
        # Default
        return random.uniform(5.0, 10.0)
    
    def _calculate_success_probability(self, drone_id: str, method: CaptureMethod) -> float:
        """
        Calculate the probability of successful drone capture
        
        Args:
            drone_id: ID of the target drone
            method: Countermeasure method
            
        Returns:
            Probability of success (0.0-1.0)
        """
        # Base probabilities for different methods
        base_probabilities = {
            CaptureMethod.NET_GUN: 0.7,
            CaptureMethod.LAUNCHER: 0.65,
            CaptureMethod.CAPTURE_DRONE: 0.5,
            CaptureMethod.INTERCEPTOR: 0.6
        }
        
        # Equipment condition factor
        equipment_factor = 1.0
        
        if method == CaptureMethod.NET_GUN:
            battery = self.equipment_status[method]["battery_percent"] / 100
            equipment_factor = 0.7 + (0.3 * battery)
        
        elif method in (CaptureMethod.CAPTURE_DRONE, CaptureMethod.INTERCEPTOR):
            battery = self.equipment_status[method]["battery_percent"] / 100
            equipment_factor = 0.6 + (0.4 * battery)
        
        elif method == CaptureMethod.LAUNCHER:
            # Launchers are less affected by condition
            equipment_factor = 0.9
        
        # Add some randomness
        random_factor = random.uniform(0.8, 1.2)
        
        final_probability = base_probabilities[method] * equipment_factor * random_factor
        
        # Clamp between 0 and 1
        return max(0.0, min(1.0, final_probability))
    
    def _update_equipment_status_on_deploy(self, method: CaptureMethod) -> None:
        """
        Update equipment status after deployment
        
        Args:
            method: Countermeasure method that was deployed
        """
        if method == CaptureMethod.NET_GUN:
            # Reduce ammo and battery
            self.equipment_status[method]["ammo_count"] -= 1
            self.equipment_status[method]["battery_percent"] = max(
                0, self.equipment_status[method]["battery_percent"] - random.randint(5, 10)
            )
            
            # Mark as not ready if out of ammo
            if self.equipment_status[method]["ammo_count"] <= 0:
                self.equipment_status[method]["ready"] = False
        
        elif method == CaptureMethod.LAUNCHER:
            # Reduce ammo
            self.equipment_status[method]["ammo_count"] -= 1
            
            # Mark as not ready if out of ammo
            if self.equipment_status[method]["ammo_count"] <= 0:
                self.equipment_status[method]["ready"] = False
            
            self.equipment_status[method]["status"] = "reloading"
        
        elif method in (CaptureMethod.CAPTURE_DRONE, CaptureMethod.INTERCEPTOR):
            # Change status and reduce battery
            self.equipment_status[method]["status"] = "deployed"
            self.equipment_status[method]["ready"] = False
            
            # Battery drains while in operation
            self.equipment_status[method]["battery_percent"] = max(
                0, self.equipment_status[method]["battery_percent"] - random.randint(10, 20)
            )
    
    def _complete_countermeasure(self, operation_id: str) -> None:
        """
        Complete a countermeasure operation and determine outcome
        
        Args:
            operation_id: ID of the countermeasure operation
        """
        if operation_id not in self.active_countermeasures:
            return
        
        deployment_info = self.active_countermeasures[operation_id]
        if not deployment_info["active"]:
            return
        
        # Determine if the operation was successful
        success_probability = deployment_info["success_probability"]
        success = random.random() < success_probability
        
        # Update deployment info
        deployment_info["active"] = False
        deployment_info["success"] = success
        deployment_info["completion_time"] = time.time()
        deployment_info["status"] = "success" if success else "failed"
        
        method = deployment_info["method"]
        drone_id = deployment_info["drone_id"]
        
        # Log result
        if success:
            logger.info(f"Successfully captured drone {drone_id} using {method.value}")
        else:
            logger.info(f"Failed to capture drone {drone_id} using {method.value}")
        
        # Update equipment status based on method
        self._update_equipment_status_on_completion(method, success)
        
        # Remove the thread
        if operation_id in self.countermeasure_threads:
            del self.countermeasure_threads[operation_id]
        
        # Update active status if no more operations are running
        if not any(cm["active"] for cm in self.active_countermeasures.values()):
            self.active = False
    
    def _update_equipment_status_on_completion(
        self, 
        method: CaptureMethod, 
        success: bool
    ) -> None:
        """
        Update equipment status after operation completion
        
        Args:
            method: Countermeasure method that was used
            success: Whether the operation was successful
        """
        if method in (CaptureMethod.CAPTURE_DRONE, CaptureMethod.INTERCEPTOR):
            # Drone returns to base position
            self.equipment_status[method]["status"] = "returning" if success else "aborting"
            
            # Battery continues to drain
            self.equipment_status[method]["battery_percent"] = max(
                0, self.equipment_status[method]["battery_percent"] - random.randint(5, 10)
            )
            
            # Schedule return to ready state
            return_time = random.uniform(20, 40)  # seconds
            
            def mark_ready():
                self.equipment_status[method]["status"] = "standby"
                self.equipment_status[method]["ready"] = (
                    self.equipment_status[method]["battery_percent"] > 20
                )
                # Reset position to base
                self.equipment_status[method]["position"] = (
                    random.uniform(16.77, 16.78),
                    random.uniform(98.97, 98.98),
                    random.uniform(10, 50)
                )
            
            timer = threading.Timer(return_time, mark_ready)
            timer.daemon = True
            timer.start()
        
        elif method == CaptureMethod.LAUNCHER:
            # Launcher needs time to reset
            reset_time = random.uniform(15, 30)  # seconds
            
            def mark_ready():
                self.equipment_status[method]["status"] = "standby"
                self.equipment_status[method]["ready"] = (
                    self.equipment_status[method]["ammo_count"] > 0
                )
            
            timer = threading.Timer(reset_time, mark_ready)
            timer.daemon = True
            timer.start()
        
        elif method == CaptureMethod.NET_GUN:
            # Net gun ready if it has ammo
            self.equipment_status[method]["ready"] = (
                self.equipment_status[method]["ammo_count"] > 0 and
                self.equipment_status[method]["battery_percent"] > 10
            )
    
    def simulate_capture_effect(self, drone_data: Dict) -> Dict:
        """
        Simulate the effect of capture attempt on a drone
        
        Args:
            drone_data: Drone data to update
            
        Returns:
            Updated drone data with capture effects
        """
        drone_id = drone_data.get("id")
        
        # Check if there's an active countermeasure against this drone
        active_operations = [
            op for op in self.active_countermeasures.values()
            if op["drone_id"] == drone_id and op["active"]
        ]
        
        if not active_operations:
            return drone_data
        
        # Clone the drone data to avoid modifying the original
        updated_drone = drone_data.copy()
        
        # Get the most recent operation
        operation = max(active_operations, key=lambda op: op["start_time"])
        method = operation["method"]
        
        # Check if the operation has completed
        if operation["status"] in ("success", "failed"):
            if operation["status"] == "success":
                # Drone was captured
                updated_drone["captured"] = True
                updated_drone["capture_method"] = method.value
                
                # Simulate effects based on method
                if method in (CaptureMethod.NET_GUN, CaptureMethod.LAUNCHER):
                    # Drone will likely crash or descend rapidly
                    if "location" in updated_drone and "altitude" in updated_drone["location"]:
                        updated_drone["location"]["altitude"] = max(
                            0, updated_drone["location"]["altitude"] - 30
                        )
                    
                    if "speed" in updated_drone:
                        updated_drone["speed"] = 0
                
                elif method in (CaptureMethod.CAPTURE_DRONE, CaptureMethod.INTERCEPTOR):
                    # Drone is being carried away
                    interceptor_pos = self.equipment_status[method]["position"]
                    if "location" in updated_drone:
                        updated_drone["location"]["latitude"] = interceptor_pos[0]
                        updated_drone["location"]["longitude"] = interceptor_pos[1]
                        if "altitude" in updated_drone["location"]:
                            updated_drone["location"]["altitude"] = interceptor_pos[2]
            
            return updated_drone
        
        # Operation is in progress but not complete
        progress = (time.time() - operation["start_time"]) / operation["time_to_target"]
        
        if progress < 1.0:
            # Countermeasure is approaching
            updated_drone["countermeasure_approaching"] = True
            updated_drone["countermeasure_type"] = method.value
            updated_drone["countermeasure_progress"] = progress
            
            # For drones and interceptors, show their approach
            if method in (CaptureMethod.CAPTURE_DRONE, CaptureMethod.INTERCEPTOR):
                if "location" in updated_drone:
                    # Calculate position between countermeasure and target
                    interceptor_pos = self.equipment_status[method]["position"]
                    target_lat = updated_drone["location"].get("latitude", 0)
                    target_lon = updated_drone["location"].get("longitude", 0)
                    
                    # Move interceptor toward target
                    interp = min(progress * 1.5, 0.95)  # Get closer but not quite there
                    new_lat = interceptor_pos[0] + (target_lat - interceptor_pos[0]) * interp
                    new_lon = interceptor_pos[1] + (target_lon - interceptor_pos[1]) * interp
                    
                    # Update interceptor position
                    self.equipment_status[method]["position"] = (
                        new_lat, new_lon, interceptor_pos[2]
                    )
        
        return updated_drone