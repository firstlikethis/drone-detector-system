import React, { useState } from 'react';
import { useDroneContext } from '../context/DroneContext';
import { 
  updateSimulatorConfig, 
  resetSimulator, 
  addTestDrone 
} from '../api/droneApi';

const ControlPanel = ({ apiBaseUrl = 'http://localhost:8000' }) => {
  const { 
    systemStatus, 
    connectionStatus, 
    refreshData 
  } = useDroneContext();
  
  // Form state
  const [numDrones, setNumDrones] = useState(5);
  const [updateInterval, setUpdateInterval] = useState(1.0);
  const [borderCenterLat, setBorderCenterLat] = useState(16.7769);
  const [borderCenterLon, setBorderCenterLon] = useState(98.9761);
  const [borderWidth, setBorderWidth] = useState(0.1);
  const [borderHeight, setBorderHeight] = useState(0.1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Update from system status when it changes
  React.useEffect(() => {
    if (systemStatus?.simulator) {
      const sim = systemStatus.simulator;
      if (sim.num_drones !== undefined) {
        setNumDrones(sim.num_drones);
      }
      if (sim.update_interval !== undefined) {
        setUpdateInterval(sim.update_interval);
      }
      if (sim.border?.center) {
        setBorderCenterLat(sim.border.center.latitude);
        setBorderCenterLon(sim.border.center.longitude);
      }
      if (sim.border?.width !== undefined) {
        setBorderWidth(sim.border.width);
      }
      if (sim.border?.height !== undefined) {
        setBorderHeight(sim.border.height);
      }
    }
  }, [systemStatus]);
  
  // Show message with timeout
  const showMessage = (msg, isError = false) => {
    setMessage({
      text: msg,
      isError
    });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };
  
  // Handle updating simulator config
  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      const config = {
        num_drones: parseInt(numDrones),
        update_interval: parseFloat(updateInterval),
        border_center_lat: parseFloat(borderCenterLat),
        border_center_lon: parseFloat(borderCenterLon),
        border_width: parseFloat(borderWidth),
        border_height: parseFloat(borderHeight)
      };
      
      await updateSimulatorConfig(apiBaseUrl, config);
      showMessage('Configuration updated successfully');
      refreshData();
    } catch (error) {
      console.error('Error updating config:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleResetSimulator = async () => {
    if (isUpdating) {
      return;
    }
    
    if (!window.confirm('Are you sure you want to reset the simulator? This will clear all drones and alerts.')) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await resetSimulator(apiBaseUrl);
      showMessage('Simulator reset successfully');
      setTimeout(() => {
        refreshData();
      }, 500);
    } catch (error) {
      console.error('Error resetting simulator:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle adding test drone
  const handleAddTestDrone = async () => {
    setIsUpdating(true);
    
    try {
      const result = await addTestDrone(apiBaseUrl);
      showMessage(`Test drone added: ID ${result.drone.id}`);
      refreshData();
    } catch (error) {
      console.error('Error adding test drone:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="bg-gray-100 p-4 border-b">
        <h2 className="text-lg font-bold text-gray-800">System Controls</h2>
        
        {/* Connection Status */}
        <div className="flex items-center mt-2">
          <div className={`w-3 h-3 rounded-full mr-2 ${connectionStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {connectionStatus ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="p-4 overflow-y-auto flex-grow">
        <form onSubmit={handleUpdateConfig}>
          <h3 className="text-md font-semibold mb-3">Simulator Configuration</h3>
          
          {/* Number of Drones */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Drones
            </label>
            <input
              type="number"
              min="0"
              max="20"
              className="w-full border rounded px-3 py-2 text-sm"
              value={numDrones}
              onChange={(e) => setNumDrones(e.target.value)}
            />
          </div>
          
          {/* Update Interval */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Update Interval (seconds)
            </label>
            <input
              type="number"
              min="0.1"
              max="10.0"
              step="0.1"
              className="w-full border rounded px-3 py-2 text-sm"
              value={updateInterval}
              onChange={(e) => setUpdateInterval(e.target.value)}
            />
          </div>
          
          {/* Border Center */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Border Center
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="-90"
                max="90"
                step="0.0001"
                placeholder="Latitude"
                className="w-1/2 border rounded px-3 py-2 text-sm"
                value={borderCenterLat}
                onChange={(e) => setBorderCenterLat(e.target.value)}
              />
              <input
                type="number"
                min="-180"
                max="180"
                step="0.0001"
                placeholder="Longitude"
                className="w-1/2 border rounded px-3 py-2 text-sm"
                value={borderCenterLon}
                onChange={(e) => setBorderCenterLon(e.target.value)}
              />
            </div>
          </div>
          
          {/* Border Size */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Border Size (degrees)
            </label>
            <div className="flex space-x-2">
              <div className="w-1/2">
                <label className="block text-xs text-gray-500 mb-1">Width</label>
                <input
                  type="number"
                  min="0.001"
                  step="0.01"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={borderWidth}
                  onChange={(e) => setBorderWidth(e.target.value)}
                />
              </div>
              <div className="w-1/2">
                <label className="block text-xs text-gray-500 mb-1">Height</label>
                <input
                  type="number"
                  min="0.001"
                  step="0.01"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={borderHeight}
                  onChange={(e) => setBorderHeight(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Update Button */}
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:bg-blue-300"
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update Configuration'}
          </button>
        </form>
        
        <div className="mt-6 space-y-3">
          <h3 className="text-md font-semibold mb-2">Actions</h3>
          
          {/* Add Test Drone */}
          <button
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:bg-green-300"
            onClick={handleAddTestDrone}
            disabled={isUpdating}
          >
            Add Test Drone
          </button>
          
          {/* Reset Simulator */}
          <button
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded disabled:bg-red-300"
            onClick={handleResetSimulator}
            disabled={isUpdating}
          >
            Reset Simulator
          </button>
          
          {/* Refresh Data */}
          <button
            className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded disabled:bg-gray-300"
            onClick={refreshData}
            disabled={isUpdating}
          >
            Refresh Data
          </button>
        </div>
      </div>
      
      {/* Status message */}
      {message && (
        <div className={`p-3 ${message.isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;