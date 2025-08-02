/**
 * API client for Drone Detection System
 */

/**
 * Fetch all drones
 * @param {string} baseUrl - API base URL
 * @param {Object} options - Query parameters
 * @returns {Promise<Array>} - List of drones
 */
export const fetchDrones = async (baseUrl, options = {}) => {
  try {
    // Build query string from options
    const queryParams = new URLSearchParams();
    
    if (options.activeOnly !== undefined) {
      queryParams.append('active_only', options.activeOnly);
    }
    
    if (options.minThreat) {
      queryParams.append('min_threat', options.minThreat);
    }
    
    if (options.droneType) {
      queryParams.append('drone_type', options.droneType);
    }
    
    const queryString = queryParams.toString();
    const url = `${baseUrl}/api/drones${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching drones:', error);
    throw error;
  }
};

/**
 * Fetch a specific drone by ID
 * @param {string} baseUrl - API base URL
 * @param {string} droneId - Drone ID
 * @returns {Promise<Object>} - Drone details
 */
export const fetchDroneById = async (baseUrl, droneId) => {
  try {
    const response = await fetch(`${baseUrl}/api/drones/${droneId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching drone ${droneId}:`, error);
    throw error;
  }
};

/**
 * Fetch all alerts
 * @param {string} baseUrl - API base URL
 * @param {Object} options - Query parameters
 * @returns {Promise<Array>} - List of alerts
 */
export const fetchAlerts = async (baseUrl, options = {}) => {
  try {
    // Build query string from options
    const queryParams = new URLSearchParams();
    
    if (options.limit !== undefined) {
      queryParams.append('limit', options.limit);
    }
    
    if (options.acknowledged !== undefined) {
      queryParams.append('acknowledged', options.acknowledged);
    }
    
    const queryString = queryParams.toString();
    const url = `${baseUrl}/api/alerts${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
};

/**
 * Acknowledge an alert
 * @param {string} baseUrl - API base URL
 * @param {string} alertId - Alert ID
 * @returns {Promise<Object>} - Response data
 */
export const acknowledgeAlert = async (baseUrl, alertId) => {
  try {
    const response = await fetch(`${baseUrl}/api/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error acknowledging alert ${alertId}:`, error);
    throw error;
  }
};

/**
 * Fetch drone statistics
 * @param {string} baseUrl - API base URL
 * @returns {Promise<Object>} - Drone statistics
 */
export const fetchDroneStats = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching drone stats:', error);
    throw error;
  }
};

/**
 * Fetch system status
 * @param {string} baseUrl - API base URL
 * @returns {Promise<Object>} - System status
 */
export const fetchSystemStatus = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/system/status`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching system status:', error);
    throw error;
  }
};

/**
 * Update simulator configuration
 * @param {string} baseUrl - API base URL
 * @param {Object} config - Configuration settings
 * @returns {Promise<Object>} - Response data
 */
export const updateSimulatorConfig = async (baseUrl, config) => {
  try {
    const response = await fetch(`${baseUrl}/api/system/simulator/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating simulator config:', error);
    throw error;
  }
};

/**
 * Reset simulator
 * @param {string} baseUrl - API base URL
 * @returns {Promise<Object>} - Response data
 */
export const resetSimulator = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/system/simulator/reset`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error resetting simulator:', error);
    throw error;
  }
};

/**
 * Add test drone
 * @param {string} baseUrl - API base URL
 * @returns {Promise<Object>} - Response data with new drone
 */
export const addTestDrone = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/system/simulator/add_drone`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding test drone:', error);
    throw error;
  }
};