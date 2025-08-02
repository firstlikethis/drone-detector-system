import React, { useState, useEffect } from 'react';
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
  
  // State for tabs
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'border', 'advanced'
  
  // Form state
  const [numDrones, setNumDrones] = useState(5);
  const [updateInterval, setUpdateInterval] = useState(1.0);
  const [borderCenterLat, setBorderCenterLat] = useState(16.7769);
  const [borderCenterLon, setBorderCenterLon] = useState(98.9761);
  const [borderWidth, setBorderWidth] = useState(0.1);
  const [borderHeight, setBorderHeight] = useState(0.1);
  const [borderRotation, setBorderRotation] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Update from system status when it changes
  useEffect(() => {
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
      if (sim.border?.rotation !== undefined) {
        setBorderRotation(sim.border.rotation);
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
        border_height: parseFloat(borderHeight),
        border_rotation: parseFloat(borderRotation)
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
  
  // Handle adding multiple test drones
  const handleAddMultipleDrones = async (count) => {
    setIsUpdating(true);
    
    try {
      // Add drones in sequence
      for (let i = 0; i < count; i++) {
        await addTestDrone(apiBaseUrl);
      }
      showMessage(`Added ${count} test drones`);
      refreshData();
    } catch (error) {
      console.error('Error adding test drones:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Presets for border locations
  const borderPresets = [
    { name: "Mae Sot (TH-MM)", lat: 16.7769, lon: 98.9761, width: 0.1, height: 0.1 },
    { name: "Ranong (TH-MM)", lat: 10.0049, lon: 98.5428, width: 0.15, height: 0.15 },
    { name: "Nong Khai (TH-LA)", lat: 17.8782, lon: 102.7471, width: 0.12, height: 0.12 },
    { name: "Aranyaprathet (TH-KH)", lat: 13.6953, lon: 102.5055, width: 0.1, height: 0.1 },
    { name: "Betong (TH-MY)", lat: 5.7645, lon: 101.0681, width: 0.08, height: 0.08 },
  ];
  
  // Apply border preset
  const applyBorderPreset = (preset) => {
    setBorderCenterLat(preset.lat);
    setBorderCenterLon(preset.lon);
    setBorderWidth(preset.width);
    setBorderHeight(preset.height);
    setBorderRotation(0);
    
    // Auto-submit
    setTimeout(() => {
      document.getElementById('update-form').dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }, 100);
  };
  
  const renderGeneralTab = () => (
    <div className="space-y-4">
      <h3 className="text-md font-semibold mb-3">Simulator Settings</h3>
      
      {/* Number of Drones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number of Drones: {numDrones}
        </label>
        <input
          type="range"
          min="0"
          max="20"
          className="w-full"
          value={numDrones}
          onChange={(e) => setNumDrones(e.target.value)}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>10</span>
          <span>20</span>
        </div>
      </div>
      
      {/* Update Interval */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Update Interval: {updateInterval} seconds
        </label>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          className="w-full"
          value={updateInterval}
          onChange={(e) => setUpdateInterval(e.target.value)}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Fast (0.1s)</span>
          <span>Slow (5s)</span>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-6">
        <h3 className="text-md font-semibold mb-3">Quick Actions</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Add Test Drone */}
          <button
            className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:bg-green-300 text-sm"
            onClick={handleAddTestDrone}
            disabled={isUpdating}
          >
            Add Test Drone
          </button>
          
          {/* Add Multiple Drones */}
          <div className="relative">
            <button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:bg-blue-300 text-sm group"
              disabled={isUpdating}
            >
              Add Multiple Drones
              
              {/* Dropdown */}
              <div className="absolute left-0 right-0 top-full mt-1 bg-white shadow-lg rounded-md overflow-hidden z-10 hidden group-hover:block">
                <button 
                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 border-b border-gray-100"
                  onClick={() => handleAddMultipleDrones(3)}
                >
                  Add 3 drones
                </button>
                <button 
                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 border-b border-gray-100"
                  onClick={() => handleAddMultipleDrones(5)}
                >
                  Add 5 drones
                </button>
                <button 
                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50"
                  onClick={() => handleAddMultipleDrones(10)}
                >
                  Add 10 drones
                </button>
              </div>
            </button>
          </div>
          
          {/* Refresh Data */}
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded disabled:bg-gray-300 text-sm"
            onClick={refreshData}
            disabled={isUpdating}
          >
            Refresh Data
          </button>
          
          {/* Reset Simulator */}
          <button
            className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded disabled:bg-red-300 text-sm"
            onClick={handleResetSimulator}
            disabled={isUpdating}
          >
            Reset Simulator
          </button>
        </div>
      </div>
    </div>
  );
  
  const renderBorderTab = () => (
    <div className="space-y-4">
      <h3 className="text-md font-semibold mb-3">Border Configuration</h3>
      
      {/* Border Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Border Presets
        </label>
        <div className="grid grid-cols-1 gap-2">
          {borderPresets.map((preset, index) => (
            <button
              key={index}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 px-3 rounded border border-blue-200 text-sm text-left"
              onClick={() => applyBorderPreset(preset)}
            >
              {preset.name} ({preset.lat.toFixed(4)}, {preset.lon.toFixed(4)})
            </button>
          ))}
        </div>
      </div>
      
      {/* Border Center */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Border Center
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Latitude</label>
            <input
              type="number"
              min="-90"
              max="90"
              step="0.0001"
              className="w-full border rounded px-3 py-2 text-sm"
              value={borderCenterLat}
              onChange={(e) => setBorderCenterLat(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Longitude</label>
            <input
              type="number"
              min="-180"
              max="180"
              step="0.0001"
              className="w-full border rounded px-3 py-2 text-sm"
              value={borderCenterLon}
              onChange={(e) => setBorderCenterLon(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Border Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Border Size (degrees)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width (~{Math.round(borderWidth * 111)} km)</label>
            <input
              type="number"
              min="0.001"
              step="0.01"
              className="w-full border rounded px-3 py-2 text-sm"
              value={borderWidth}
              onChange={(e) => setBorderWidth(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height (~{Math.round(borderHeight * 111)} km)</label>
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
      
      {/* Border Rotation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Border Rotation: {borderRotation}°
        </label>
        <input
          type="range"
          min="0"
          max="359"
          step="1"
          className="w-full"
          value={borderRotation}
          onChange={(e) => setBorderRotation(e.target.value)}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0°</span>
          <span>180°</span>
          <span>359°</span>
        </div>
      </div>
      
      {/* Help Text */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <p className="mb-1">
          <strong>Width/Height:</strong> 0.1° ≈ 11 km at the equator
        </p>
        <p>
          <strong>Note:</strong> Changing the border will reset any active drones
        </p>
      </div>
    </div>
  );
  
  const renderAdvancedTab = () => (
    <div className="space-y-4">
      <h3 className="text-md font-semibold mb-3">Advanced Settings</h3>
      
      {/* Raw Config */}
      <div className="bg-gray-50 p-3 rounded border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Configuration
        </label>
        
        <div className="bg-gray-900 text-green-400 font-mono text-xs p-3 rounded overflow-auto max-h-48">
          <pre>
{`{
  "num_drones": ${numDrones},
  "update_interval": ${updateInterval},
  "border": {
    "center": {
      "latitude": ${borderCenterLat},
      "longitude": ${borderCenterLon}
    },
    "width": ${borderWidth},
    "height": ${borderHeight},
    "rotation": ${borderRotation}
  }
}`}
          </pre>
        </div>
      </div>
      
      {/* System Info */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">System Information</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium">{systemStatus?.status || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span>Version:</span>
            <span className="font-medium">{systemStatus?.system?.version || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span>WebSocket:</span>
            <span className={`font-medium ${connectionStatus ? 'text-green-600' : 'text-red-600'}`}>
              {connectionStatus ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Drone Distribution */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Drone Distribution</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-gray-200 rounded p-2">
            <h5 className="text-xs font-medium text-center mb-1">Threat Levels</h5>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                <span className="text-xs">None: 30%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span className="text-xs">Low: 40%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                <span className="text-xs">Medium: 20%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                <span className="text-xs">High: 7%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                <span className="text-xs">Critical: 3%</span>
              </div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded p-2">
            <h5 className="text-xs font-medium text-center mb-1">Drone Types</h5>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
                <span className="text-xs">Commercial: 70%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
                <span className="text-xs">DIY: 20%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
                <span className="text-xs">Military: 5%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
                <span className="text-xs">Unknown: 5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
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
      
      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'general' ? 'bg-white text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'border' ? 'bg-white text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('border')}
        >
          Border
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'advanced' ? 'bg-white text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
      </div>
      
      <form id="update-form" onSubmit={handleUpdateConfig} className="p-4 overflow-y-auto flex-grow">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'border' && renderBorderTab()}
        {activeTab === 'advanced' && renderAdvancedTab()}
        
        {/* Update Button */}
        <button
          type="submit"
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:bg-blue-300"
          disabled={isUpdating}
        >
          {isUpdating ? 'Updating...' : 'Update Configuration'}
        </button>
      </form>
      
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