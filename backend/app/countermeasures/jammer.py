"""
RF Jamming module for drone countermeasures
"""
import logging
import threading
import time
from typing import Dict, List, Optional, Tuple, Union
from enum import Enum

logger = logging.getLogger(__name__)

class JammerType(str, Enum):
    """Types of jammers that can be used"""
    DIRECTIONAL = "directional"     # Jam in specific direction
    BROADBAND = "broadband"         # Jam wide frequency range
    SELECTIVE = "selective"         # Jam specific protocols

class JammerMode(str, Enum):
    """Jamming modes"""
    CONTINUOUS = "continuous"       # Continuous jamming
    REACTIVE = "reactive"           # Jam only when drone detected
    INTELLIGENT = "intelligent"     # Smart jamming based on threat level
    SWEEP = "sweep"                 # Sweep through frequencies

class DroneJammer:
    """
    Controls RF jamming equipment to disrupt drone communications
    
    In simulation mode, this only affects the simulated drones' signal strength
    When connected to hardware, it controls actual RF jammers
    """
    
    def __init__(self):
        """Initialize the jammer system"""
        self.active = False
        self.current_frequency = None
        self.power_level = 0
        self.mode = JammerMode.CONTINUOUS
        self.jammer_type = JammerType.DIRECTIONAL
        self.hardware_connected = False
        self.jammer_device = None
        self.active_jammers: Dict[str, Dict] = {}  # Track active jammers by ID
        self.target_frequencies = []
        self.jamming_threads = {}
        
        # Common drone frequencies
        self.frequency_presets = {
            "control_2.4ghz": 2.4e9,            # 2.4 GHz control
            "video_5.8ghz": 5.8e9,              # 5.8 GHz FPV video
            "gps_l1": 1.57542e9,                # GPS L1 frequency
            "telemetry_433mhz": 433e6,          # 433 MHz telemetry
            "telemetry_915mhz": 915e6,          # 915 MHz telemetry
            "dji_lightbridge": 2.4e9,           # DJI Lightbridge
            "dji_ocusync": [2.4e9, 5.8e9],      # DJI OcuSync
            "futaba_fhss": 2.4e9,               # Futaba FHSS
            "spektrum_dsm2": 2.4e9,             # Spektrum DSM2
            "frsky_accst": 2.4e9,               # FrSky ACCST
        }
        
        # Drone manufacturer protocols for selective jamming
        self.drone_protocols = {
            "dji": ["control_2.4ghz", "video_5.8ghz", "dji_lightbridge", "dji_ocusync"],
            "parrot": ["control_2.4ghz", "video_5.8ghz"],
            "yuneec": ["control_2.4ghz", "video_5.8ghz"],
            "autel": ["control_2.4ghz", "video_5.8ghz"],
            "skydio": ["control_2.4ghz", "video_5.8ghz"],
        }
        
        logger.info("Drone jammer system initialized")
    
    def connect_hardware(self, device_id: str = None) -> bool:
        """
        Connect to RF jammer hardware
        
        Args:
            device_id: Optional device ID or path
            
        Returns:
            Success status
        """
        try:
            # In a real implementation, this would connect to actual hardware
            # Example: self.jammer_device = JammerHardware(device_id)
            
            # Simulation mode
            logger.info("Connected to simulated RF jammer")
            self.hardware_connected = True
            self.jammer_device = "SIMULATED_JAMMER"
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to jammer hardware: {e}")
            self.hardware_connected = False
            return False
    
    def activate_jamming(
        self, 
        frequency: Union[float, List[float]], 
        power_level: int = 50, 
        duration: Optional[float] = None,
        jammer_id: str = "default",
        direction: Optional[Tuple[float, float]] = None
    ) -> Dict:
        """
        Activate RF jamming on specified frequency
        
        Args:
            frequency: Target frequency in Hz or list of frequencies
            power_level: Power level (0-100%)
            duration: Duration in seconds, None for continuous
            jammer_id: Identifier for this jamming session
            direction: Optional (azimuth, elevation) for directional jammers
            
        Returns:
            Status information
        """
        frequencies = [frequency] if isinstance(frequency, (int, float)) else frequency
        
        # Set jamming parameters
        jamming_info = {
            "frequencies": frequencies,
            "power_level": power_level,
            "start_time": time.time(),
            "duration": duration,
            "direction": direction,
            "active": True
        }
        
        self.active_jammers[jammer_id] = jamming_info
        self.active = True
        
        logger.info(
            f"Activating jammer {jammer_id}: "
            f"Freq: {frequencies}, Power: {power_level}%, "
            f"Duration: {duration or 'continuous'} sec"
        )
        
        # If hardware is connected, send commands to actual device
        if self.hardware_connected:
            # In real implementation, this would configure the hardware
            # Example: self.jammer_device.set_frequency(frequency)
            #         self.jammer_device.set_power(power_level)
            #         self.jammer_device.enable()
            pass
        
        # Start a thread to deactivate after duration if specified
        if duration:
            if jammer_id in self.jamming_threads:
                # Cancel existing thread if running
                self.jamming_threads[jammer_id].cancel()
                
            timer = threading.Timer(
                duration, 
                lambda: self.deactivate_jamming(jammer_id)
            )
            timer.daemon = True
            timer.start()
            self.jamming_threads[jammer_id] = timer
        
        return {
            "status": "active",
            "jammer_id": jammer_id,
            "frequencies": frequencies,
            "power_level": power_level,
            "duration": duration,
            "mode": self.mode,
            "hardware_active": self.hardware_connected
        }
    
    def deactivate_jamming(self, jammer_id: str = "default") -> Dict:
        """
        Deactivate RF jamming
        
        Args:
            jammer_id: Identifier for the jamming session to deactivate
            
        Returns:
            Status information
        """
        if jammer_id in self.active_jammers:
            jamming_info = self.active_jammers[jammer_id]
            jamming_info["active"] = False
            
            # Calculate jamming duration
            start_time = jamming_info["start_time"]
            jamming_duration = time.time() - start_time
            
            # Remove from active jammers
            del self.active_jammers[jammer_id]
            
            # Cancel timer thread if exists
            if jammer_id in self.jamming_threads:
                self.jamming_threads[jammer_id].cancel()
                del self.jamming_threads[jammer_id]
            
            logger.info(f"Deactivated jammer {jammer_id} after {jamming_duration:.2f} seconds")
            
            # If hardware is connected, send commands to actual device
            if self.hardware_connected:
                # Example: self.jammer_device.disable()
                pass
            
            # Update active status if no more jammers are running
            if not self.active_jammers:
                self.active = False
            
            return {
                "status": "deactivated",
                "jammer_id": jammer_id,
                "duration": jamming_duration
            }
        else:
            return {
                "status": "error",
                "message": f"Jammer {jammer_id} not active",
                "jammer_id": jammer_id
            }
    
    def jam_drone_control(
        self, 
        drone_type: str, 
        power_level: int = 70,
        duration: Optional[float] = None
    ) -> Dict:
        """
        Jam drone control frequencies based on drone type
        
        Args:
            drone_type: Type/manufacturer of drone
            power_level: Power level (0-100%)
            duration: Duration in seconds, None for continuous
            
        Returns:
            Status information
        """
        drone_type = drone_type.lower()
        jammer_id = f"control_{drone_type}_{int(time.time())}"
        
        if drone_type in self.drone_protocols:
            # Get frequencies for this drone type
            protocol_names = self.drone_protocols[drone_type]
            frequencies = []
            
            for protocol in protocol_names:
                if protocol in self.frequency_presets:
                    freq = self.frequency_presets[protocol]
                    if isinstance(freq, list):
                        frequencies.extend(freq)
                    else:
                        frequencies.append(freq)
            
            # Start jamming
            return self.activate_jamming(
                frequency=frequencies,
                power_level=power_level,
                duration=duration,
                jammer_id=jammer_id
            )
        else:
            # Generic approach - jam common control frequencies
            return self.activate_jamming(
                frequency=[2.4e9, 5.8e9],  # 2.4 GHz and 5.8 GHz
                power_level=power_level,
                duration=duration,
                jammer_id=jammer_id
            )
    
    def jam_gps(
        self, 
        power_level: int = 60,
        duration: Optional[float] = None
    ) -> Dict:
        """
        Jam GPS frequencies to disrupt drone navigation
        
        Args:
            power_level: Power level (0-100%)
            duration: Duration in seconds, None for continuous
            
        Returns:
            Status information
        """
        jammer_id = f"gps_{int(time.time())}"
        
        # GPS frequencies
        gps_frequencies = [
            1.57542e9,  # GPS L1 (1575.42 MHz)
            1.2276e9,   # GPS L2 (1227.6 MHz)
            1.17645e9,  # GPS L5 (1176.45 MHz)
            1.602e9,    # GLONASS L1 (1602 MHz)
            1.246e9     # GLONASS L2 (1246 MHz)
        ]
        
        return self.activate_jamming(
            frequency=gps_frequencies,
            power_level=power_level,
            duration=duration,
            jammer_id=jammer_id
        )
    
    def get_active_jammers(self) -> Dict:
        """
        Get information about all active jammers
        
        Returns:
            Dictionary of active jammers and their status
        """
        return {
            "active": self.active,
            "jammers": self.active_jammers,
            "hardware_connected": self.hardware_connected,
            "mode": self.mode
        }
    
    def set_mode(self, mode: JammerMode) -> Dict:
        """
        Set the jamming mode
        
        Args:
            mode: The jamming mode to set
            
        Returns:
            Status information
        """
        if isinstance(mode, str):
            try:
                mode = JammerMode(mode)
            except ValueError:
                return {
                    "status": "error",
                    "message": f"Invalid mode: {mode}"
                }
        
        self.mode = mode
        logger.info(f"Jammer mode set to: {mode}")
        
        return {
            "status": "success",
            "mode": self.mode
        }
    
    def set_jammer_type(self, jammer_type: JammerType) -> Dict:
        """
        Set the jammer type
        
        Args:
            jammer_type: The jammer type to set
            
        Returns:
            Status information
        """
        if isinstance(jammer_type, str):
            try:
                jammer_type = JammerType(jammer_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": f"Invalid jammer type: {jammer_type}"
                }
        
        self.jammer_type = jammer_type
        logger.info(f"Jammer type set to: {jammer_type}")
        
        return {
            "status": "success",
            "jammer_type": self.jammer_type
        }
    
    def emergency_shutdown(self) -> Dict:
        """
        Emergency shutdown of all jammers
        
        Returns:
            Status information
        """
        # Stop all active jammers
        for jammer_id in list(self.active_jammers.keys()):
            self.deactivate_jamming(jammer_id)
        
        # Cancel all timer threads
        for thread in self.jamming_threads.values():
            thread.cancel()
        
        self.jamming_threads.clear()
        self.active = False
        
        logger.warning("Emergency shutdown of all jammers")
        
        return {
            "status": "shutdown_complete",
            "active_jammers": len(self.active_jammers),
            "message": "All jammers deactivated"
        }
    
    def simulate_jamming_effect(self, drone_data: Dict, distance_meters: float = 100) -> Dict:
        """
        Simulate the effect of jamming on a drone
        
        Args:
            drone_data: Drone data to update
            distance_meters: Distance from jammer in meters
            
        Returns:
            Updated drone data
        """
        if not self.active:
            return drone_data
        
        # Clone the drone data to avoid modifying the original
        updated_drone = drone_data.copy()
        
        # Calculate jamming effectiveness based on power and distance
        max_jammers = max([jam["power_level"] for jam in self.active_jammers.values()], default=0)
        
        # Effect decreases with distance (inverse square law)
        distance_factor = min(1.0, 100 / max(1, distance_meters))
        jamming_effect = max_jammers * distance_factor
        
        # Apply jamming effects
        # 1. Reduce signal strength
        if "signal_strength" in updated_drone:
            updated_drone["signal_strength"] = max(
                0, updated_drone["signal_strength"] - jamming_effect * 0.5
            )
        
        # 2. Potentially disrupt control (increase drift, reduce accuracy)
        if "location" in updated_drone and jamming_effect > 50:
            # Add random drift to location
            drift_factor = (jamming_effect - 50) / 100
            
            if "latitude" in updated_drone["location"]:
                updated_drone["location"]["latitude"] += random.uniform(-0.0001, 0.0001) * drift_factor
            
            if "longitude" in updated_drone["location"]:
                updated_drone["location"]["longitude"] += random.uniform(-0.0001, 0.0001) * drift_factor
        
        # 3. Flag drone as being jammed
        updated_drone["is_jammed"] = jamming_effect > 30
        updated_drone["jamming_level"] = jamming_effect
        
        # 4. If jamming is very effective, simulate control loss
        if jamming_effect > 80:
            updated_drone["control_compromised"] = True
            
            # In real system, this might trigger the drone to enter failsafe mode
            if "threat_level" in updated_drone:
                updated_drone["threat_level"] = "high"  # Increase threat level
        
        return updated_drone

# Add code to import the random module at the top of the file
import random