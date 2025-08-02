import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDroneWebSocketClient } from '../api/websocket';
import { fetchDrones, fetchAlerts, fetchSystemStatus, acknowledgeAlert } from '../api/droneApi';

// Default border configuration
const DEFAULT_BORDER = {
  center: {
    latitude: 16.7769,
    longitude: 98.9761
  },
  width: 0.1,
  height: 0.1,
  rotation: 0
};

// Create the context
const DroneContext = createContext(null);

// Provider component
export const DroneProvider = ({ children, apiBaseUrl = 'http://localhost:8000', wsUrl = 'ws://localhost:8000/ws/drones' }) => {
  // State for drones and alerts
  const [drones, setDrones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedDroneId, setSelectedDroneId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [border, setBorder] = useState(DEFAULT_BORDER);
  const [systemStatus, setSystemStatus] = useState(null);
  const [countermeasuresStatus, setCountermeasuresStatus] = useState(null); // New state for countermeasures
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize WebSocket client
  const wsClient = getDroneWebSocketClient(wsUrl);

  // Connect to WebSocket on mount
  useEffect(() => {
    // Connect WebSocket
    wsClient.connect();

    // Handle drone updates
    const droneUnsubscribe = wsClient.onDrones((droneData) => {
      setDrones(droneData);
    });

    // Handle alert notifications
    const alertUnsubscribe = wsClient.onAlerts((alertData) => {
      setAlerts(prevAlerts => {
        // Check if alert already exists
        const exists = prevAlerts.some(a => a.id === alertData.id);
        if (exists) {
          return prevAlerts;
        }
        // Add new alert at the beginning
        return [alertData, ...prevAlerts];
      });
      
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 770;
        gainNode.gain.value = 0.1;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
      } catch (err) {
        console.warn('Could not play alert sound', err);
      }
    });

    // Handle connection status
    const connectionUnsubscribe = wsClient.onConnection((status) => {
      setConnectionStatus(status.connected);
      
      // If just connected, fetch initial data
      if (status.connected) {
        fetchInitialData();
      }
    });

    // Handle system status updates
    const systemStatusUnsubscribe = wsClient.onSystemStatus((statusData) => {
      setSystemStatus(statusData);
      
      // Update border if available
      if (statusData && statusData.simulator && statusData.simulator.border) {
        setBorder(statusData.simulator.border);
      }
    });

    // Handle countermeasures status updates
    const countermeasuresStatusUnsubscribe = wsClient.onCountermeasuresStatus((statusData) => {
      setCountermeasuresStatus(statusData);
    });

    // Handle errors
    const errorUnsubscribe = wsClient.onError((error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Attempting to reconnect...');
    });

    // Fetch initial data
    fetchInitialData();

    // Cleanup on unmount
    return () => {
      droneUnsubscribe();
      alertUnsubscribe();
      connectionUnsubscribe();
      systemStatusUnsubscribe();
      countermeasuresStatusUnsubscribe();
      errorUnsubscribe();
      wsClient.disconnect();
    };
  }, [apiBaseUrl, wsUrl]);

  // Fetch initial data from REST API
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch drones
      const dronesData = await fetchDrones(apiBaseUrl);
      setDrones(dronesData);
      
      // Fetch alerts
      const alertsData = await fetchAlerts(apiBaseUrl);
      setAlerts(alertsData);
      
      // Fetch system status (includes border config)
      const statusData = await fetchSystemStatus(apiBaseUrl);
      setSystemStatus(statusData);
      
      // Update border if available
      if (statusData && statusData.simulator && statusData.simulator.border) {
        setBorder(statusData.simulator.border);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('Failed to fetch data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Acknowledge an alert
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await acknowledgeAlert(apiBaseUrl, alertId);
      
      // Update local state
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, is_acknowledged: true } 
            : alert
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError('Failed to acknowledge alert.');
      return false;
    }
  };

  // Select a drone
  const selectDrone = useCallback((droneId) => {
    setSelectedDroneId(droneId);
  }, []);

  // Get selected drone
  const getSelectedDrone = useCallback(() => {
    if (!selectedDroneId) return null;
    return drones.find(drone => drone.id === selectedDroneId) || null;
  }, [drones, selectedDroneId]);

  // Refresh data manually
  const refreshData = useCallback(() => {
    fetchInitialData();
  }, [apiBaseUrl]);

  // Context value
  const value = {
    drones,
    alerts,
    border,
    selectedDroneId,
    connectionStatus,
    systemStatus,
    countermeasuresStatus, // Add countermeasures status to context
    error,
    loading,
    selectDrone,
    getSelectedDrone,
    refreshData,
    acknowledgeAlert: handleAcknowledgeAlert,
  };

  return (
    <DroneContext.Provider value={value}>
      {children}
    </DroneContext.Provider>
  );
};

export const useDroneContext = () => {
  const context = useContext(DroneContext);
  if (!context) {
    throw new Error('useDroneContext must be used within a DroneProvider');
  }
  return context;
};

export default DroneContext;