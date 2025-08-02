import React, { useState, useEffect } from 'react';
import { useDroneContext } from '../context/DroneContext';
import { 
  activateJamming, 
  jamDroneControl, 
  deactivateJamming,
  getJammerStatus,
  takeoverDrone,
  forceLanding,
  stopTakeover,
  checkVulnerabilities,
  captureDrone,
  getEquipmentStatus,
  emergencyJamAll,
  emergencyStopAll
} from '../api/countermeasureApi';

const CountermeasurePanel = ({ apiBaseUrl = 'http://localhost:8000' }) => {
  const { selectedDroneId, drones, refreshData } = useDroneContext();
  
  // Selected drone
  const selectedDrone = drones.find(d => d.id === selectedDroneId);
  
  // State
  const [activeTab, setActiveTab] = useState('jam'); // 'jam', 'takeover', 'physical'
  const [jammers, setJammers] = useState([]);
  const [takeoverStatus, setTakeoverStatus] = useState({});
  const [equipment, setEquipment] = useState({});
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [jamPower, setJamPower] = useState(70);
  const [jamDuration, setJamDuration] = useState(30);
  const [jamGps, setJamGps] = useState(false);
  const [takeoverMethod, setTakeoverMethod] = useState('gps_spoofing');
  const [takeoverCommand, setTakeoverCommand] = useState('land');
  const [captureMethod, setCaptureMethod] = useState('net_gun');
  
  // Fetch status on mount and when tab changes
  useEffect(() => {
    fetchStatusData();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchStatusData, 5000);
    
    return () => clearInterval(interval);
  }, [activeTab, apiBaseUrl]);
  
  // Fetch vulnerabilities when drone selected
  useEffect(() => {
    if (selectedDroneId && activeTab === 'takeover') {
      fetchVulnerabilities();
    }
  }, [selectedDroneId, activeTab]);
  
  // Fetch status data based on active tab
  const fetchStatusData = async () => {
    try {
      if (activeTab === 'jam') {
        const result = await getJammerStatus(apiBaseUrl);
        if (result.status === 'success') {
          setJammers(result.jammer_status.jammers || {});
        }
      } else if (activeTab === 'physical') {
        const result = await getEquipmentStatus(apiBaseUrl);
        if (result.status === 'success') {
          setEquipment(result.equipment || {});
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };
  
  // Fetch vulnerabilities for selected drone
  const fetchVulnerabilities = async () => {
    if (!selectedDroneId) return;
    
    try {
      setLoading(true);
      const result = await checkVulnerabilities(apiBaseUrl, selectedDroneId);
      
      if (result.status === 'success') {
        setVulnerabilities(result.vulnerabilities || []);
      }
    } catch (error) {
      console.error('Error checking vulnerabilities:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
  
  // Handle jamming drone
  const handleJamDrone = async () => {
    if (!selectedDroneId) {
      showMessage('Please select a drone first', true);
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await jamDroneControl(
        apiBaseUrl, 
        selectedDroneId, 
        jamGps, 
        jamDuration, 
        jamPower
      );
      
      if (result.status === 'success') {
        showMessage(`Jamming drone ${selectedDroneId}`);
        fetchStatusData();
        refreshData();
      } else {
        showMessage(`Error: ${result.message}`, true);
      }
    } catch (error) {
      console.error('Error jamming drone:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deactivating a jammer
  const handleDeactivateJammer = async (jammerId) => {
    setLoading(true);
    
    try {
      const result = await deactivateJamming(apiBaseUrl, jammerId);
      
      if (result.status === 'success') {
        showMessage(`Jammer ${jammerId} deactivated`);
        fetchStatusData();
        refreshData();
      } else {
        showMessage(`Error: ${result.message}`, true);
      }
    } catch (error) {
      console.error('Error deactivating jammer:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle taking over drone
  const handleTakeoverDrone = async () => {
    if (!selectedDroneId) {
      showMessage('Please select a drone first', true);
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await takeoverDrone(
        apiBaseUrl,
        selectedDroneId,
        takeoverMethod,
        takeoverCommand,
        {},  // parameters
        jamDuration
      );
      
      if (result.status === 'success') {
        showMessage(`Taking over drone ${selectedDroneId}`);
        fetchStatusData();
        refreshData();
      } else {
        showMessage(`Error: ${result.message}`, true);
      }
    } catch (error) {
      console.error('Error taking over drone:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle force landing
  const handleForceLanding = async () => {
    if (!selectedDroneId) {
      showMessage('Please select a drone first', true);
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await forceLanding(apiBaseUrl, selectedDroneId);
      
      if (result.status === 'success') {
        showMessage(`Forcing drone ${selectedDroneId} to land`);
        fetchStatusData();
        refreshData();
      } else {
        showMessage(`Error: ${result.message}`, true);
      }
    } catch (error) {
      console.error('Error forcing landing:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle stopping takeover
  const handleStopTakeover = async () => {
    if (!selectedDroneId) {
      showMessage('Please select a drone first', true);
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await stopTakeover(apiBaseUrl, selectedDroneId);
      
      if (result.status === 'success') {
        showMessage(`Takeover stopped for drone ${selectedDroneId}`);
        fetchStatusData();
        refreshData();
      } else {
        showMessage(`Error: ${result.message}`, true);
      }
    } catch (error) {
      console.error('Error stopping takeover:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle capturing drone
  const handleCaptureDrone = async () => {
    if (!selectedDroneId) {
      showMessage('Please select a drone first', true);
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await captureDrone(
        apiBaseUrl,
        selectedDroneId,
        captureMethod,
        {}  // parameters
      );
      
      if (result.status === 'success') {
        showMessage(`Deploying ${captureMethod} to capture drone ${selectedDroneId}`);
        fetchStatusData();
        refreshData();
      } else {
        showMessage(`Error: ${result.message}`, true);
      }
    } catch (error) {
      console.error('Error capturing drone:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle emergency jam all
  const handleEmergencyJamAll = async () => {
    if (!window.confirm('This will activate maximum power jamming on all frequencies. Continue?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await emergencyJamAll(apiBaseUrl);
      
      if (result.status === 'success') {
        showMessage('Emergency jamming activated on all frequencies');
        fetchStatusData();
        refreshData();
      } else {
        showMessage(`Error: ${result.message}`, true);
      }
    } catch (error) {
      console.error('Error activating emergency jam:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle emergency stop all
  const handleEmergencyStopAll = async () => {
    setLoading(true);
    
    try {
      const result = await emergencyStopAll(apiBaseUrl);
      
      if (result.status === 'success') {
        showMessage('All countermeasures stopped');
        fetchStatusData();
        refreshData();
      } else {
        showMessage(`Error: ${result.message}`, true);
      }
    } catch (error) {
      console.error('Error stopping all countermeasures:', error);
      showMessage(`Error: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  
  // Format time in seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Render jammer list
  const renderJammerList = () => {
    const jammerIds = Object.keys(jammers);
    
    if (jammerIds.length === 0) {
      return (
        <div className="text-gray-500 text-center py-4">
          No active jammers
        </div>
      );
    }
    
    return (
      <div className="space-y-2 mt-4">
        <h3 className="text-sm font-semibold">Active Jammers</h3>
        
        {jammerIds.map(jammerId => {
          const jammer = jammers[jammerId];
          const frequencies = jammer.frequencies || [];
          const timeElapsed = Math.floor((Date.now() / 1000) - jammer.start_time);
          const timeRemaining = jammer.duration ? jammer.duration - timeElapsed : null;
          
          return (
            <div key={jammerId} className="bg-gray-100 p-3 rounded shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">{jammerId}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Frequencies: {frequencies.map(f => `${(f / 1e9).toFixed(1)} GHz`).join(', ')}
                  </div>
                  <div className="text-xs text-gray-600">
                    Power: {jammer.power_level}% | 
                    {timeRemaining ? ` Time: ${formatTime(timeRemaining)}` : ' Continuous'}
                  </div>
                </div>
                
                <button
                  className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
                  onClick={() => handleDeactivateJammer(jammerId)}
                  disabled={loading}
                >
                  Stop
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Render vulnerabilities list
  const renderVulnerabilities = () => {
    if (loading) {
      return (
        <div className="text-gray-500 text-center py-4">
          Scanning for vulnerabilities...
        </div>
      );
    }
    
    if (!selectedDroneId) {
      return (
        <div className="text-gray-500 text-center py-4">
          Select a drone to check vulnerabilities
        </div>
      );
    }
    
    if (vulnerabilities.length === 0) {
      return (
        <div className="text-gray-500 text-center py-4">
          No vulnerabilities detected
        </div>
      );
    }
    
    return (
      <div className="space-y-2 mt-4">
        <h3 className="text-sm font-semibold">Detected Vulnerabilities</h3>
        
        {vulnerabilities.map((vuln, index) => (
          <div key={index} className="bg-gray-100 p-2 rounded shadow-sm">
            <div className="font-medium text-sm">{vuln.type}</div>
            <div className="text-xs text-gray-600 mt-1">
              Method: {vuln.method} | Confidence: {Math.round(vuln.confidence * 100)}%
            </div>
            <div className="text-xs text-gray-600">{vuln.description}</div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render equipment status
  const renderEquipmentStatus = () => {
    const methods = Object.keys(equipment);
    
    if (methods.length === 0) {
      return (
        <div className="text-gray-500 text-center py-4">
          No equipment available
        </div>
      );
    }
    
    return (
      <div className="space-y-2 mt-4">
        <h3 className="text-sm font-semibold">Equipment Status</h3>
        
        {methods.map(method => {
          const status = equipment[method];
          
          if (!status.available) return null;
          
          return (
            <div key={method} className="bg-gray-100 p-2 rounded shadow-sm">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${status.ready ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className="font-medium text-sm capitalize">{method.replace('_', ' ')}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-600 mt-1">
                <div>Status: {status.status || 'N/A'}</div>
                <div>Range: {status.range_meters}m</div>
                
                {status.battery_percent !== undefined && (
                  <div>Battery: {status.battery_percent}%</div>
                )}
                
                {status.ammo_count !== undefined && (
                  <div>Ammo: {status.ammo_count}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
        <h2 className="text-lg font-bold">Countermeasures</h2>
        
        {/* Selected drone indicator */}
        {selectedDroneId ? (
          <div className="text-sm">
            Target: <span className="font-semibold">#{selectedDroneId}</span>
            {selectedDrone && (
              <span className="ml-1 text-xs">
                ({selectedDrone.type})
              </span>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-400">No target selected</div>
        )}
      </div>
      
      {/* Tab navigation */}
      <div className="bg-gray-100 flex border-b">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'jam' ? 'bg-white text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('jam')}
        >
          RF Jamming
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'takeover' ? 'bg-white text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('takeover')}
        >
          Takeover
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'physical' ? 'bg-white text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('physical')}
        >
          Physical
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto flex-grow">
        {/* RF Jamming Tab */}
        {activeTab === 'jam' && (
          <div>
            <h3 className="text-md font-semibold mb-3">RF Jammer Control</h3>
            
            <div className="space-y-3">
              {/* Power Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Power Level: {jamPower}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  className="w-full"
                  value={jamPower}
                  onChange={(e) => setJamPower(parseInt(e.target.value))}
                />
              </div>
              
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration: {jamDuration} seconds
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  className="w-full"
                  value={jamDuration}
                  onChange={(e) => setJamDuration(parseInt(e.target.value))}
                />
              </div>
              
              {/* GPS Jamming */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="jam-gps"
                  className="mr-2"
                  checked={jamGps}
                  onChange={(e) => setJamGps(e.target.checked)}
                />
                <label htmlFor="jam-gps" className="text-sm font-medium text-gray-700">
                  Also jam GPS signals
                </label>
              </div>
              
              {/* Jam Button */}
              <button
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded disabled:bg-red-300"
                onClick={handleJamDrone}
                disabled={loading || !selectedDroneId}
              >
                {loading ? 'Processing...' : 'Jam Drone Control'}
              </button>
              
              {/* Emergency Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded text-sm"
                  onClick={handleEmergencyJamAll}
                  disabled={loading}
                >
                  Emergency Jam All
                </button>
                <button
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded text-sm"
                  onClick={handleEmergencyStopAll}
                  disabled={loading}
                >
                  Stop All
                </button>
              </div>
            </div>
            
            {/* Active Jammers */}
            {renderJammerList()}
          </div>
        )}
        
        {/* Takeover Tab */}
        {activeTab === 'takeover' && (
          <div>
            <h3 className="text-md font-semibold mb-3">Drone Takeover Control</h3>
            
            <div className="space-y-3">
              {/* Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Takeover Method
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={takeoverMethod}
                  onChange={(e) => setTakeoverMethod(e.target.value)}
                >
                  <option value="gps_spoofing">GPS Spoofing</option>
                  <option value="protocol_hijack">Protocol Hijacking</option>
                  <option value="command_injection">Command Injection</option>
                  <option value="mav_injection">MAVLink Injection</option>
                </select>
              </div>
              
              {/* Command Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Command
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={takeoverCommand}
                  onChange={(e) => setTakeoverCommand(e.target.value)}
                >
                  <option value="land">Land Immediately</option>
                  <option value="return_to_home">Return to Home</option>
                  <option value="hover">Hover in Place</option>
                  <option value="move_to">Move to Coordinates</option>
                  <option value="disconnect">Force Disconnect</option>
                  <option value="shutdown">Emergency Shutdown</option>
                </select>
              </div>
              
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration: {jamDuration} seconds
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  className="w-full"
                  value={jamDuration}
                  onChange={(e) => setJamDuration(parseInt(e.target.value))}
                />
              </div>
              
              {/* Takeover Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded disabled:bg-purple-300"
                  onClick={handleTakeoverDrone}
                  disabled={loading || !selectedDroneId}
                >
                  {loading ? 'Processing...' : 'Take Control'}
                </button>
                <button
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded disabled:bg-red-300"
                  onClick={handleForceLanding}
                  disabled={loading || !selectedDroneId}
                >
                  Force Landing
                </button>
              </div>
              
              {/* Stop Button */}
              <button
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded disabled:bg-gray-300"
                onClick={handleStopTakeover}
                disabled={loading || !selectedDroneId}
              >
                Stop Takeover
              </button>
            </div>
            
            {/* Vulnerabilities */}
            {renderVulnerabilities()}
          </div>
        )}
        
        {/* Physical Tab */}
        {activeTab === 'physical' && (
          <div>
            <h3 className="text-md font-semibold mb-3">Physical Countermeasures</h3>
            
            <div className="space-y-3">
              {/* Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capture Method
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={captureMethod}
                  onChange={(e) => setCaptureMethod(e.target.value)}
                >
                  <option value="net_gun">Net Gun</option>
                  <option value="capture_drone">Capture Drone</option>
                  <option value="interceptor">Interceptor Drone</option>
                  <option value="launcher">Net Launcher</option>
                </select>
              </div>
              
              {/* Deploy Button */}
              <button
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:bg-green-300"
                onClick={handleCaptureDrone}
                disabled={loading || !selectedDroneId}
              >
                {loading ? 'Deploying...' : 'Deploy Countermeasure'}
              </button>
            </div>
            
            {/* Equipment Status */}
            {renderEquipmentStatus()}
          </div>
        )}
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

export default CountermeasurePanel;