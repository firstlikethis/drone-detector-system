/**
 * API client for Drone Countermeasures
 */

/**
 * Activate RF jamming on specific frequencies
 * @param {string} baseUrl - API base URL
 * @param {string} droneId - Target drone ID
 * @param {Array} frequencies - Frequencies to jam (optional)
 * @param {number} duration - Duration in seconds
 * @param {number} powerLevel - Power level (1-100%)
 * @param {string} jammerType - Type of jammer to use (optional)
 * @returns {Promise<Object>} - Response data
 */
export const activateJamming = async (
  baseUrl, 
  droneId, 
  frequencies = null,
  duration = 30,
  powerLevel = 50,
  jammerType = null
) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/jam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drone_id: droneId,
        frequencies,
        duration,
        power_level: powerLevel,
        jammer_type: jammerType
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error activating jamming:', error);
    throw error;
  }
};

/**
 * Jam a drone's control frequencies
 * @param {string} baseUrl - API base URL
 * @param {string} droneId - Target drone ID
 * @param {boolean} jamGps - Whether to jam GPS
 * @param {number} duration - Duration in seconds
 * @param {number} powerLevel - Power level (1-100%)
 * @returns {Promise<Object>} - Response data
 */
export const jamDroneControl = async (
  baseUrl,
  droneId,
  jamGps = false,
  duration = 30,
  powerLevel = 70
) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/jam/drone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drone_id: droneId,
        jam_gps: jamGps,
        duration,
        power_level: powerLevel
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error jamming drone control:', error);
    throw error;
  }
};

/**
 * Deactivate a specific jammer
 * @param {string} baseUrl - API base URL
 * @param {string} jammerId - Jammer ID to deactivate
 * @returns {Promise<Object>} - Response data
 */
export const deactivateJamming = async (baseUrl, jammerId) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/jam/${jammerId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deactivating jammer:', error);
    throw error;
  }
};

/**
 * Get status of all active jammers
 * @param {string} baseUrl - API base URL
 * @returns {Promise<Object>} - Response data
 */
export const getJammerStatus = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/jam/status`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting jammer status:', error);
    throw error;
  }
};

/**
 * Take over control of a drone
 * @param {string} baseUrl - API base URL
 * @param {string} droneId - Target drone ID
 * @param {string} method - Takeover method
 * @param {string} command - Command to send
 * @param {Object} parameters - Command parameters
 * @param {number} duration - Duration in seconds
 * @returns {Promise<Object>} - Response data
 */
export const takeoverDrone = async (
  baseUrl,
  droneId,
  method,
  command,
  parameters = {},
  duration = null
) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/takeover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drone_id: droneId,
        method,
        command,
        parameters,
        duration
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error taking over drone:', error);
    throw error;
  }
};

/**
 * Force a drone to land
 * @param {string} baseUrl - API base URL
 * @param {string} droneId - Target drone ID
 * @returns {Promise<Object>} - Response data
 */
export const forceLanding = async (baseUrl, droneId) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/takeover/land`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drone_id: droneId
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error forcing landing:', error);
    throw error;
  }
};

/**
 * Stop an active takeover
 * @param {string} baseUrl - API base URL
 * @param {string} droneId - Target drone ID
 * @returns {Promise<Object>} - Response data
 */
export const stopTakeover = async (baseUrl, droneId) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/takeover/${droneId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error stopping takeover:', error);
    throw error;
  }
};

/**
 * Check a drone for vulnerabilities
 * @param {string} baseUrl - API base URL
 * @param {string} droneId - Target drone ID
 * @returns {Promise<Object>} - Response data
 */
export const checkVulnerabilities = async (baseUrl, droneId) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/takeover/vulnerabilities/${droneId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking vulnerabilities:', error);
    throw error;
  }
};

/**
 * Deploy physical countermeasure to capture a drone
 * @param {string} baseUrl - API base URL
 * @param {string} droneId - Target drone ID
 * @param {string} method - Capture method
 * @param {Object} parameters - Capture parameters
 * @returns {Promise<Object>} - Response data
 */
export const captureDrone = async (
  baseUrl,
  droneId,
  method,
  parameters = {}
) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/physical/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drone_id: droneId,
        method,
        parameters
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error capturing drone:', error);
    throw error;
  }
};

/**
 * Get physical equipment status
 * @param {string} baseUrl - API base URL
 * @param {string} method - Optional specific method to check
 * @returns {Promise<Object>} - Response data
 */
export const getEquipmentStatus = async (baseUrl, method = null) => {
  try {
    const url = method 
      ? `${baseUrl}/api/countermeasures/physical/equipment?method=${method}`
      : `${baseUrl}/api/countermeasures/physical/equipment`;
      
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting equipment status:', error);
    throw error;
  }
};

/**
 * Emergency jam all frequencies
 * @param {string} baseUrl - API base URL
 * @returns {Promise<Object>} - Response data
 */
export const emergencyJamAll = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/emergency/jam/all`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error emergency jamming all:', error);
    throw error;
  }
};

/**
 * Emergency stop all countermeasures
 * @param {string} baseUrl - API base URL
 * @returns {Promise<Object>} - Response data
 */
export const emergencyStopAll = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/countermeasures/emergency/stop/all`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error stopping all countermeasures:', error);
    throw error;
  }
};