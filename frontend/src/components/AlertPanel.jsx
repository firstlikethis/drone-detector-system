import React, { useState, useEffect } from 'react';
import { useDroneContext } from '../context/DroneContext';

const AlertPanel = () => {
  const { alerts, acknowledgeAlert, selectDrone } = useDroneContext();
  const [visibleAlerts, setVisibleAlerts] = useState([]);
  const [filter, setFilter] = useState('unacknowledged'); // 'all', 'unacknowledged'
  
  // Apply filter when alerts change
  useEffect(() => {
    if (filter === 'unacknowledged') {
      setVisibleAlerts(alerts.filter(alert => !alert.is_acknowledged));
    } else {
      setVisibleAlerts(alerts);
    }
  }, [alerts, filter]);

  // Format timestamp to readable format
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Get color for threat level
  const getThreatColor = (level) => {
    switch (level) {
      case 'none': return 'bg-blue-500';
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Format alert type
  const formatAlertType = (type) => {
    if (!type) return 'Unknown';
    
    // Replace underscores with spaces and capitalize words
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Handle acknowledging alert
  const handleAcknowledge = async (alertId, e) => {
    e.stopPropagation(); // Prevent clicking through to the alert
    await acknowledgeAlert(alertId);
  };
  
  // Handle clicking on an alert to select the drone
  const handleAlertClick = (droneId) => {
    selectDrone(droneId);
  };
  
  return (
    <div className="bg-gray-800 text-white h-full flex flex-col">
      <div className="bg-gray-700 p-3 flex justify-between items-center border-b border-gray-600">
        <h2 className="text-lg font-bold">Alerts</h2>
        <div className="flex space-x-2">
          <select 
            className="bg-gray-800 text-white px-2 py-1 rounded text-sm border border-gray-600"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Alerts</option>
            <option value="unacknowledged">Unacknowledged</option>
          </select>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto p-2">
        {visibleAlerts.length === 0 ? (
          <div className="text-gray-400 text-center p-4">
            No alerts to display
          </div>
        ) : (
          <div className="space-y-2">
            {visibleAlerts.map(alert => (
              <div 
                key={alert.id}
                className={`rounded p-3 ${alert.is_acknowledged ? 'bg-gray-700 opacity-70' : 'bg-gray-700 border-l-4 ' + getThreatColor(alert.threat_level)}`}
                onClick={() => handleAlertClick(alert.drone_id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <div className="font-bold flex justify-between">
                      <span>{formatAlertType(alert.alert_type)}</span>
                      <span className="text-xs text-gray-400">{formatTime(alert.timestamp)}</span>
                    </div>
                    <p className="text-sm mt-1">{alert.description}</p>
                    <div className="text-xs mt-2 text-gray-400">
                      Drone ID: {alert.drone_id} | Location: {alert.location.latitude.toFixed(5)}, {alert.location.longitude.toFixed(5)}
                    </div>
                  </div>
                  
                  {!alert.is_acknowledged && (
                    <button 
                      className="ml-2 bg-gray-600 hover:bg-gray-500 text-xs px-2 py-1 rounded"
                      onClick={(e) => handleAcknowledge(alert.id, e)}
                    >
                      Ack
                    </button>
                  )}
                </div>
                
                {/* Threat level indicator */}
                <div className="flex items-center mt-2">
                  <div className={`w-2 h-2 rounded-full mr-2 ${getThreatColor(alert.threat_level)}`}></div>
                  <span className="text-xs capitalize">{alert.threat_level} threat</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertPanel;