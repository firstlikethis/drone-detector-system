import React, { useState, useEffect, useRef } from 'react';
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
  const { 
    selectedDroneId, 
    drones, 
    refreshData, 
    countermeasuresStatus 
  } = useDroneContext();
  
  const selectedDrone = drones.find(d => d.id === selectedDroneId);
  
  const [activeTab, setActiveTab] = useState('jam'); 
  const [jammers, setJammers] = useState({});
  const [takeoverStatus, setTakeoverStatus] = useState({});
  const [equipment, setEquipment] = useState({});
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const [jamPower, setJamPower] = useState(70);
  const [jamDuration, setJamDuration] = useState(30);
  const [jamGps, setJamGps] = useState(false);
  const [takeoverMethod, setTakeoverMethod] = useState('gps_spoofing');
  const [takeoverCommand, setTakeoverCommand] = useState('land');
  const [captureMethod, setCaptureMethod] = useState('net_gun');
  
  // Refs for animations
  const statusUpdateTimerRef = useRef(null);
  const messageTimerRef = useRef(null);
  
  // Track attacked drones for UI feedback
  const [jammedDrones, setJammedDrones] = useState(new Set());
  const [takenOverDrones, setTakenOverDrones] = useState(new Set());
  
  // ตรวจสอบว่าโดรนที่เลือกกำลังถูกแจมหรือควบคุมอยู่หรือไม่
  const isSelectedDroneJammed = useRef(false);
  const isSelectedDroneTakenOver = useRef(false);
  
  useEffect(() => {
    // Update countermeasure status from context
    if (countermeasuresStatus) {
      if (countermeasuresStatus.jammers) {
        setJammers(countermeasuresStatus.jammers.jammers || {});
      }
      
      if (countermeasuresStatus.takeovers) {
        setTakeoverStatus(countermeasuresStatus.takeovers);
      }
      
      if (countermeasuresStatus.physical) {
        setEquipment(countermeasuresStatus.physical.equipment || {});
      }
      
      // Extract jammed and taken over drones
      const newJammedDrones = new Set();
      const newTakenOverDrones = new Set();
      
      // Check jammers
      if (countermeasuresStatus.jammers && countermeasuresStatus.jammers.jammers) {
        const jammers = countermeasuresStatus.jammers.jammers;
        
        Object.keys(jammers).forEach(jammerId => {
          const match = jammerId.match(/api_(.+)/);
          if (match) {
            const droneId = match[1];
            newJammedDrones.add(droneId);
          }
        });
      }
      
      // Check takeovers
      if (countermeasuresStatus.takeovers && countermeasuresStatus.takeovers.takeovers) {
        const takeovers = countermeasuresStatus.takeovers.takeovers;
        
        Object.keys(takeovers).forEach(droneId => {
          if (takeovers[droneId].active) {
            newTakenOverDrones.add(droneId);
          }
        });
      }
      
      setJammedDrones(newJammedDrones);
      setTakenOverDrones(newTakenOverDrones);
    }
    
    // Check if selected drone is affected by countermeasures
    isSelectedDroneJammed.current = false;
    isSelectedDroneTakenOver.current = false;
    
    if (selectedDroneId && countermeasuresStatus) {
      // Check if selected drone is being jammed
      const jammerKeys = Object.keys(countermeasuresStatus.jammers?.jammers || {});
      const jammingThisDrone = jammerKeys.some(key => key.includes(selectedDroneId));
      isSelectedDroneJammed.current = jammingThisDrone;
      
      // Check if selected drone is being taken over
      const takenOverDrones = Object.keys(countermeasuresStatus.takeovers?.takeovers || {});
      isSelectedDroneTakenOver.current = takenOverDrones.includes(selectedDroneId);
    }
  }, [countermeasuresStatus, selectedDroneId]);
  
  // Fetch status on mount and periodically
  useEffect(() => {
    fetchStatusData();
    
    // Set up timer for periodic updates
    statusUpdateTimerRef.current = setInterval(fetchStatusData, 5000);
    
    return () => {
      clearInterval(statusUpdateTimerRef.current);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, [activeTab, apiBaseUrl]);
  
  // Fetch vulnerabilities when selected drone changes
  useEffect(() => {
    if (selectedDroneId && activeTab === 'takeover') {
      fetchVulnerabilities();
    }
  }, [selectedDroneId, activeTab]);
  
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
  
  const showMessage = (msg, isError = false) => {
    setMessage({
      text: msg,
      isError
    });
    
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    
    messageTimerRef.current = setTimeout(() => {
      setMessage(null);
    }, 3000);
  };
  
  // ฟังก์ชันยืนยันการทำงาน
  const confirmAndExecute = (action, confirmMessage) => {
    setConfirmAction(() => action);
    setConfirmDialogOpen(true);
  };
  
  // ฟังก์ชันสำหรับการดำเนินการเมื่อกดยืนยัน
  const handleConfirmAction = async () => {
    setConfirmDialogOpen(false);
    if (confirmAction) {
      await confirmAction();
      setConfirmAction(null);
    }
  };
  
  const handleJamDrone = async () => {
    if (!selectedDroneId) {
      showMessage('Please select a drone first', true);
      return;
    }
    
    // Check if drone is already jammed
    const isAlreadyJammed = jammedDrones.has(selectedDroneId);
    
    const actionFunc = async () => {
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
          showMessage(`${isAlreadyJammed ? 'Updated jamming for' : 'Jamming'} drone ${selectedDroneId}`);
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
    
    confirmAndExecute(actionFunc, `${isAlreadyJammed ? 'Update jamming for' : 'Jam'} drone ${selectedDroneId}?`);
  };
  
  const handleDeactivateJammer = async (jammerId) => {
    setLoading(true);
    
    try {
      const result = await deactivateJamming(apiBaseUrl, jammerId);
      
      if (result.status === 'success') {
        showMessage(`Jammer ${jammerId} deactivated`);
        
        // If this is jamming our selected drone, update the reference
        const match = jammerId.match(/api_(.+)/);
        if (match && match[1] === selectedDroneId) {
          isSelectedDroneJammed.current = false;
        }
        
        // Update our UI state
        setJammedDrones(prevJammed => {
          const newJammed = new Set(prevJammed);
          if (match) {
            newJammed.delete(match[1]);
          }
          return newJammed;
        });
        
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
  
  const handleTakeoverDrone = async () => {
    if (!selectedDroneId) {
      showMessage('Please select a drone first', true);
      return;
    }
    
    // Check if drone is already taken over
    const isAlreadyTakenOver = takenOverDrones.has(selectedDroneId);
    
    const actionFunc = async () => {
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
        
        if (result.status === 'active') {
          showMessage(`${isAlreadyTakenOver ? 'Updated takeover of' : 'Taking over'} drone ${selectedDroneId}`);
          
          // Update our UI state
          setTakenOverDrones(prev => {
            const newSet = new Set(prev);
            newSet.add(selectedDroneId);
            return newSet;
          });
          
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
    
    confirmAndExecute(actionFunc, `${isAlreadyTakenOver ? 'Update takeover of' : 'Take over'} drone ${selectedDroneId} using ${takeoverMethod}?`);
  };
  
  // Handle force landing
  const handleForceLanding = async () => {
    if (!selectedDroneId) {
      showMessage('Please select a drone first', true);
      return;
    }
    
    const actionFunc = async () => {
      setLoading(true);
      
      try {
        const result = await forceLanding(apiBaseUrl, selectedDroneId);
        
        if (result.status === 'success') {
          showMessage(`Forcing drone ${selectedDroneId} to land`);
          
          // Update our UI state
          setTakenOverDrones(prev => {
            const newSet = new Set(prev);
            newSet.add(selectedDroneId);
            return newSet;
          });
          
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
    
    confirmAndExecute(actionFunc, `Force drone ${selectedDroneId} to land?`);
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
      
      if (result.status === 'success' || result.status === 'stopped') {
        showMessage(`Takeover stopped for drone ${selectedDroneId}`);
        
        // Update our UI state
        setTakenOverDrones(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedDroneId);
          return newSet;
        });
        
        isSelectedDroneTakenOver.current = false;
        
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
    
    const actionFunc = async () => {
      setLoading(true);
      
      try {
        const result = await captureDrone(
          apiBaseUrl,
          selectedDroneId,
          captureMethod,
          {}  // parameters
        );
        
        if (result.status === 'success' || result.status === 'deploying') {
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
    
    confirmAndExecute(actionFunc, `Deploy ${captureMethod.replace('_', ' ')} to capture drone ${selectedDroneId}?`);
  };
  
  // Handle emergency jam all
  const handleEmergencyJamAll = async () => {
    const actionFunc = async () => {
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
    
    confirmAndExecute(
      actionFunc, 
      'WARNING: This will activate maximum power jamming on ALL frequencies and may affect friendly drones. Continue?'
    );
  };
  
  // Handle emergency stop all
  const handleEmergencyStopAll = async () => {
    setLoading(true);
    
    try {
      const result = await emergencyStopAll(apiBaseUrl);
      
      if (result.status === 'success') {
        showMessage('All countermeasures stopped');
        
        // Clear our UI state
        setJammedDrones(new Set());
        setTakenOverDrones(new Set());
        isSelectedDroneJammed.current = false;
        isSelectedDroneTakenOver.current = false;
        
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
          
          // Check if this jammer is targeting a drone
          const targetedDroneMatch = jammerId.match(/api_(.+)/);
          const targetedDrone = targetedDroneMatch ? targetedDroneMatch[1] : null;
          
          return (
            <div 
              key={jammerId} 
              className={`bg-gray-800 p-3 rounded-lg shadow-sm border ${
                targetedDrone && targetedDrone === selectedDroneId 
                  ? 'border-blue-500' 
                  : 'border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm text-blue-300">
                    {jammerId}
                    {targetedDrone && (
                      <span className="ml-1 text-xs bg-blue-900 text-white px-1 py-0.5 rounded">
                        Drone #{targetedDrone}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Frequencies: {frequencies.map(f => `${(f / 1e9).toFixed(1)} GHz`).join(', ')}
                  </div>
                  <div className="text-xs text-gray-400">
                    Power: {jammer.power_level}% | 
                    {timeRemaining ? (
                      <span className={timeRemaining < 10 ? 'text-orange-400' : ''}>
                        {' '}Time: {formatTime(timeRemaining)}
                      </span>
                    ) : ' Continuous'}
                  </div>
                </div>
                
                <button
                  className="bg-red-800 hover:bg-red-700 text-white text-xs py-1 px-2 rounded"
                  onClick={() => handleDeactivateJammer(jammerId)}
                  disabled={loading}
                >
                  Stop
                </button>
              </div>
              
              {/* Progress bar for remaining time */}
              {timeRemaining && jammer.duration && (
                <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-1.5"
                    style={{
                      width: `${Math.max(0, (1 - timeElapsed / jammer.duration) * 100)}%`,
                      transition: 'width 1s linear'
                    }}
                  ></div>
                </div>
              )}
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
          <div className="flex justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Scanning for vulnerabilities...</span>
          </div>
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
        
        {vulnerabilities.map((vuln, index) => {
          const confidence = Math.round(vuln.confidence * 100);
          const confidenceColor = confidence > 80 ? 'text-green-400' : confidence > 50 ? 'text-yellow-400' : 'text-red-400';
          
          return (
            <div key={index} className="bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-700">
              <div className="font-medium text-sm text-blue-300">{vuln.type}</div>
              <div className="text-xs text-gray-400 mt-1">
                Method: <span className="text-purple-300">{vuln.method}</span> | 
                Confidence: <span className={confidenceColor}>{confidence}%</span>
              </div>
              <div className="text-xs text-gray-400">{vuln.description}</div>
            </div>
          );
        })}
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
          
          // Calculate status color
          const statusColor = status.ready ? 'text-green-400' : 'text-red-400';
          
          // Calculate battery level color if applicable
          let batteryColor = 'bg-green-500';
          if (status.battery_percent !== undefined) {
            if (status.battery_percent < 30) batteryColor = 'bg-red-500';
            else if (status.battery_percent < 70) batteryColor = 'bg-yellow-500';
          }
          
          return (
            <div key={method} className="bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${status.ready ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="font-medium text-sm capitalize">{method.replace('_', ' ')}</div>
                </div>
                <div className="text-xs bg-gray-700 rounded px-2 py-0.5 uppercase tracking-wide font-medium">
                  <span className={statusColor}>{status.status || (status.ready ? 'Ready' : 'Not Ready')}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-400 mt-2">
                <div>Range: {status.range_meters}m</div>
                
                {status.battery_percent !== undefined && (
                  <div className="flex items-center">
                    <span className="mr-2">Battery:</span>
                    <div className="flex-grow h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-1.5 ${batteryColor}`}
                        style={{ width: `${status.battery_percent}%` }}
                      ></div>
                    </div>
                    <span className="ml-1">{status.battery_percent}%</span>
                  </div>
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
  
  // Get style for drone status indicator
  const getDroneStatusIndicator = () => {
    if (!selectedDroneId) return null;
    
    // Check current drone status
    const isJammed = jammedDrones.has(selectedDroneId);
    const isTakenOver = takenOverDrones.has(selectedDroneId);
    
    let statusText = "No active countermeasures";
    let statusColor = "bg-gray-500";
    let pulseClass = "";
    
    if (isJammed) {
      statusText = "Jamming Active";
      statusColor = "bg-black";
      pulseClass = "animate-pulse";
    } else if (isTakenOver) {
      statusText = "Control Active";
      statusColor = "bg-purple-500";
      pulseClass = "animate-pulse";
    }
    
    return (
      <div className="flex items-center mt-1">
        <div className={`w-2 h-2 rounded-full mr-1 ${statusColor} ${pulseClass}`}></div>
        <span className="text-xs text-gray-400">{statusText}</span>
      </div>
    );
  };
  
  // Count active countermeasures
  const getCountermeasureCounts = () => {
    return {
      jammed: jammedDrones.size,
      takenOver: takenOverDrones.size,
      total: jammedDrones.size + takenOverDrones.size
    };
  };
  
  const counts = getCountermeasureCounts();
  
  return (
    <div className="bg-gray-900 text-white h-full flex flex-col">
      <div className="bg-gray-800 p-3 flex justify-between items-center border-b border-gray-700">
        <h2 className="text-lg font-bold">Countermeasures</h2>
        
        {/* Selected drone indicator */}
        <div>
          {selectedDroneId ? (
            <div>
              <div className="text-sm">
                Target: <span className="font-semibold text-blue-300">#{selectedDroneId}</span>
                {selectedDrone && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({selectedDrone.type})
                  </span>
                )}
              </div>
              {getDroneStatusIndicator()}
            </div>
          ) : (
            <div className="text-sm text-gray-400">No target selected</div>
          )}
        </div>
      </div>
      
      {/* Active countermeasures count */}
      {counts.total > 0 && (
        <div className="bg-gray-800 px-3 py-2 border-b border-gray-700 flex justify-between items-center">
          <div className="text-sm">Active Countermeasures</div>
          <div className="flex space-x-2">
            {counts.jammed > 0 && (
              <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded">
                {counts.jammed} Jammed
              </span>
            )}
            {counts.takenOver > 0 && (
              <span className="text-xs bg-purple-900 text-white px-2 py-0.5 rounded">
                {counts.takenOver} Controlled
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Tab navigation */}
      <div className="bg-gray-800 flex border-b border-gray-700">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'jam' ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('jam')}
        >
          RF Jamming
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'takeover' ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('takeover')}
        >
          Takeover
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'physical' ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('physical')}
        >
          Physical
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto flex-grow bg-gray-900">
        {/* RF Jamming Tab */}
        {activeTab === 'jam' && (
          <div>
            <h3 className="text-md font-semibold mb-3">RF Jammer Control</h3>
            
            <div className="space-y-3">
              {/* Power Level */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Power Level: {jamPower}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={jamPower}
                  onChange={(e) => setJamPower(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
              
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Duration: {jamDuration} seconds
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={jamDuration}
                  onChange={(e) => setJamDuration(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5s</span>
                  <span>60s</span>
                  <span>120s</span>
                </div>
              </div>
              
              {/* GPS Jamming */}
              <div className="flex items-center p-2 bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  id="jam-gps"
                  className="mr-2 h-4 w-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                  checked={jamGps}
                  onChange={(e) => setJamGps(e.target.checked)}
                />
                <label htmlFor="jam-gps" className="text-sm font-medium text-gray-300">
                  Also jam GPS signals
                </label>
              </div>
              
              {/* Jam Button */}
              <button
                className={`w-full py-2 px-4 rounded font-medium ${
                  loading ? 'bg-gray-600 cursor-not-allowed' :
                  jammedDrones.has(selectedDroneId) ? 'bg-red-700 hover:bg-red-600' :
                  'bg-red-600 hover:bg-red-500'
                } ${!selectedDroneId ? 'opacity-50 cursor-not-allowed' : ''} transition-colors`}
                onClick={handleJamDrone}
                disabled={loading || !selectedDroneId}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : jammedDrones.has(selectedDroneId) ? 'Update Jamming' : 'Jam Drone Control'}
              </button>
              
              {/* Emergency Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  className="bg-orange-700 hover:bg-orange-600 text-white py-2 px-4 rounded text-sm font-medium disabled:bg-orange-900 disabled:cursor-not-allowed transition-colors"
                  onClick={handleEmergencyJamAll}
                  disabled={loading}
                >
                  Emergency Jam All
                </button>
                <button
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded text-sm font-medium disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Takeover Method
                </label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Command
                </label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Duration: {jamDuration} seconds
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={jamDuration}
                  onChange={(e) => setJamDuration(parseInt(e.target.value))}
                />
              </div>
              
              {/* Takeover Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`py-2 px-4 rounded font-medium ${
                    loading ? 'bg-gray-600 cursor-not-allowed' :
                    takenOverDrones.has(selectedDroneId) ? 'bg-purple-700 hover:bg-purple-600' :
                    'bg-purple-600 hover:bg-purple-500'
                  } ${!selectedDroneId ? 'opacity-50 cursor-not-allowed' : ''} transition-colors`}
                  onClick={handleTakeoverDrone}
                  disabled={loading || !selectedDroneId}
                >
                  {takenOverDrones.has(selectedDroneId) ? 'Update Control' : 'Take Control'}
                </button>
                <button
                  className={`py-2 px-4 rounded font-medium ${
                    loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'
                  } ${!selectedDroneId ? 'opacity-50 cursor-not-allowed' : ''} transition-colors`}
                  onClick={handleForceLanding}
                  disabled={loading || !selectedDroneId}
                >
                  Force Landing
                </button>
              </div>
              
              {/* Stop Button */}
              <button
                className={`w-full py-2 px-4 rounded font-medium ${
                  loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'
                } ${!selectedDroneId || !takenOverDrones.has(selectedDroneId) ? 'opacity-50 cursor-not-allowed' : ''} transition-colors`}
                onClick={handleStopTakeover}
                disabled={loading || !selectedDroneId || !takenOverDrones.has(selectedDroneId)}
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Capture Method
                </label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
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
                className={`w-full py-2 px-4 rounded font-medium ${
                  loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'
                } ${!selectedDroneId ? 'opacity-50 cursor-not-allowed' : ''} transition-colors`}
                onClick={handleCaptureDrone}
                disabled={loading || !selectedDroneId}
              >
                {loading ? 'Deploying...' : 'Deploy Countermeasure'}
              </button>
              
              {/* Help text */}
              <div className="text-xs text-gray-500 p-2 bg-gray-800 rounded-lg">
                <p className="mb-1">
                  <span className="text-yellow-400">Warning:</span> Physical countermeasures require line of sight and close proximity to target drone.
                </p>
                <p>
                  Equipment must be in "Ready" state to deploy.
                </p>
              </div>
            </div>
            
            {/* Equipment Status */}
            {renderEquipmentStatus()}
          </div>
        )}
      </div>
      
      {/* Status message */}
      {message && (
        <div className={`p-3 ${message.isError ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'} border-t border-gray-700`}>
          {message.text}
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {confirmDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Confirm Action</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to proceed with this action?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium"
                onClick={() => setConfirmDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-medium"
                onClick={handleConfirmAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountermeasurePanel;