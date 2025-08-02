import React, { useState, useEffect, useRef } from 'react';
import { useDroneContext } from '../context/DroneContext';

const AlertPanel = () => {
  const { alerts, acknowledgeAlert, selectDrone } = useDroneContext();
  const [visibleAlerts, setVisibleAlerts] = useState([]);
  const [filter, setFilter] = useState('unacknowledged'); // 'all', 'unacknowledged'
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const alertsEndRef = useRef(null);
  
  // Apply filters when alerts change
  useEffect(() => {
    let filtered = [...alerts];
    
    // Apply acknowledged/unacknowledged filter
    if (filter === 'unacknowledged') {
      filtered = filtered.filter(alert => !alert.is_acknowledged);
    }
    
    // Apply search term filter if present
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.description.toLowerCase().includes(term) ||
        alert.drone_id.toLowerCase().includes(term) ||
        alert.alert_type.toLowerCase().includes(term)
      );
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    setVisibleAlerts(filtered);
  }, [alerts, filter, searchTerm]);

  // Auto-scroll to new alerts
  useEffect(() => {
    // Only auto-scroll if we're viewing unacknowledged alerts and a new one arrived
    if (filter === 'unacknowledged' && alertsEndRef.current) {
      alertsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleAlerts.length, filter]);

  // Format timestamp to readable format
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid';
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      
      // If less than a minute ago, show "just now" or seconds
      if (diffSec < 60) {
        return diffSec < 10 ? 'just now' : `${diffSec} sec ago`;
      }
      
      // If less than an hour ago, show minutes
      if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60);
        return `${mins} min ago`;
      }
      
      // Otherwise show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Error';
    }
  };

  // Get color for threat level
  const getThreatStyle = (level) => {
    switch (level) {
      case 'none': return { 
        border: 'border-blue-500', 
        bg: 'bg-blue-100', 
        text: 'text-blue-800',
        icon: 'bg-blue-500' 
      };
      case 'low': return { 
        border: 'border-green-500', 
        bg: 'bg-green-100', 
        text: 'text-green-800',
        icon: 'bg-green-500' 
      };
      case 'medium': return { 
        border: 'border-yellow-500', 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800',
        icon: 'bg-yellow-500' 
      };
      case 'high': return { 
        border: 'border-orange-500', 
        bg: 'bg-orange-100', 
        text: 'text-orange-800',
        icon: 'bg-orange-500' 
      };
      case 'critical': return { 
        border: 'border-red-500', 
        bg: 'bg-red-100', 
        text: 'text-red-800',
        icon: 'bg-red-500' 
      };
      default: return { 
        border: 'border-gray-500', 
        bg: 'bg-gray-100', 
        text: 'text-gray-800',
        icon: 'bg-gray-500' 
      };
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
  
  // Get icon for alert type
  const getAlertIcon = (type) => {
    switch (type) {
      case 'border_violation':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'restricted_zone':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'signal_interference':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'unauthorized_flight':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'new_detection':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
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

  // Toggle expanded state for an alert
  const toggleAlertExpanded = (alertId) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [alertId]: !prev[alertId]
    }));
  };
  
  // Clear all acknowledged alerts
  const handleAcknowledgeAll = async () => {
    const unacknowledgedAlerts = visibleAlerts.filter(alert => !alert.is_acknowledged);
    
    if (unacknowledgedAlerts.length === 0) return;
    
    if (window.confirm(`Acknowledge all ${unacknowledgedAlerts.length} alerts?`)) {
      for (const alert of unacknowledgedAlerts) {
        await acknowledgeAlert(alert.id);
      }
    }
  };
  
  return (
    <div className="bg-gray-800 text-white h-full flex flex-col">
      <div className="bg-gray-700 p-3 flex flex-col border-b border-gray-600">
        <div className="flex justify-between items-center">
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
        
        {/* Search and action bar */}
        <div className="flex mt-2 gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search alerts..."
              className="w-full bg-gray-900 text-white text-sm rounded pl-8 pr-2 py-1 border border-gray-700 focus:border-blue-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-2 top-1.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded px-2"
            onClick={handleAcknowledgeAll}
            title="Acknowledge all visible alerts"
          >
            Ack All
          </button>
        </div>
        
        {/* Alert stats */}
        <div className="flex justify-between mt-2 text-xs text-gray-300">
          <span>{visibleAlerts.length} alerts</span>
          <span>
            {visibleAlerts.filter(a => !a.is_acknowledged).length} unacknowledged
          </span>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto p-2 space-y-2">
        {visibleAlerts.length === 0 ? (
          <div className="text-gray-400 text-center p-4">
            {filter === 'unacknowledged' 
              ? 'No unacknowledged alerts' 
              : searchTerm 
                ? 'No alerts match your search' 
                : 'No alerts to display'}
          </div>
        ) : (
          <>
            {visibleAlerts.map(alert => {
              const threatStyle = getThreatStyle(alert.threat_level);
              const isExpanded = expandedAlerts[alert.id];
              
              return (
                <div 
                  key={alert.id}
                  className={`rounded p-3 transition-all duration-200 ${
                    alert.is_acknowledged 
                      ? 'bg-gray-700 opacity-70' 
                      : `bg-gray-700 border-l-4 ${threatStyle.border}`
                  } ${isExpanded ? 'shadow-lg' : ''}`}
                >
                  {/* Alert header - always visible */}
                  <div 
                    className="flex justify-between items-start cursor-pointer"
                    onClick={() => toggleAlertExpanded(alert.id)}
                  >
                    <div className="flex items-start space-x-2">
                      {/* Icon for alert type */}
                      <div className={`p-1.5 rounded-full ${threatStyle.bg} ${threatStyle.text}`}>
                        {getAlertIcon(alert.alert_type)}
                      </div>
                      
                      <div>
                        <div className="font-bold flex items-center">
                          <span>{formatAlertType(alert.alert_type)}</span>
                          {!alert.is_acknowledged && (
                            <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-sm mt-0.5 text-gray-300">{alert.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400">{formatTime(alert.timestamp)}</span>
                      <div className="flex mt-1">
                        {!alert.is_acknowledged && (
                          <button 
                            className="ml-2 bg-gray-600 hover:bg-gray-500 text-xs px-2 py-0.5 rounded"
                            onClick={(e) => handleAcknowledge(alert.id, e)}
                          >
                            Ack
                          </button>
                        )}
                        
                        <button 
                          className="ml-2 text-gray-400 hover:text-gray-200"
                          onClick={() => toggleAlertExpanded(alert.id)}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded alert details */}
                  {isExpanded && (
                    <div className="mt-3 text-sm border-t border-gray-600 pt-2">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                        <div className="text-gray-400">Drone ID:</div>
                        <div 
                          className="text-blue-400 hover:text-blue-300 cursor-pointer"
                          onClick={() => handleAlertClick(alert.drone_id)}
                        >
                          #{alert.drone_id}
                        </div>
                        
                        <div className="text-gray-400">Threat Level:</div>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-1 ${threatStyle.icon}`}></div>
                          <span className="capitalize">{alert.threat_level}</span>
                        </div>
                        
                        <div className="text-gray-400">Location:</div>
                        <div>
                          {alert.location.latitude.toFixed(5)}, {alert.location.longitude.toFixed(5)}
                        </div>
                        
                        <div className="text-gray-400">Time:</div>
                        <div>
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="mt-2 flex justify-end">
                        <button 
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded"
                          onClick={() => handleAlertClick(alert.drone_id)}
                        >
                          Focus on Drone
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Ref for auto-scrolling to new alerts */}
            <div ref={alertsEndRef} />
          </>
        )}
      </div>
      
      {visibleAlerts.length > 5 && (
        <div className="bg-gray-700 p-2 border-t border-gray-600 text-xs text-center">
          <button 
            className="text-blue-400 hover:text-blue-300"
            onClick={() => alertsEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            Scroll to Latest
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertPanel;