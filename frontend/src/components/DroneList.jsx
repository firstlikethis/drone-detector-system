import React, { useState, useEffect } from 'react';
import { useDroneContext } from '../context/DroneContext';

const DroneList = () => {
  const { drones, selectedDroneId, selectDrone } = useDroneContext();
  const [sortField, setSortField] = useState('threat_level');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');
  const [threatFilter, setThreatFilter] = useState('all'); // 'all', 'none', 'low', 'medium', 'high', 'critical'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'commercial', 'military', 'diy', 'unknown'
  const [displayMode, setDisplayMode] = useState('table'); // 'table', 'cards'
  
  // Get unique drone types from current drones
  const droneTypes = React.useMemo(() => {
    const types = new Set(drones.map(drone => drone.type));
    return ['all', ...Array.from(types)];
  }, [drones]);
  
  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set default direction
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Apply sorting and filtering
  const filteredAndSortedDrones = React.useMemo(() => {
    return [...drones]
      .filter(drone => {
        // Text filter
        if (filter) {
          const searchLower = filter.toLowerCase();
          const matchesSearch = drone.id.toLowerCase().includes(searchLower) ||
            drone.type.toLowerCase().includes(searchLower) ||
            drone.threat_level.toLowerCase().includes(searchLower);
            
          if (!matchesSearch) return false;
        }
        
        // Threat level filter
        if (threatFilter !== 'all' && drone.threat_level !== threatFilter) {
          return false;
        }
        
        // Drone type filter
        if (typeFilter !== 'all' && drone.type !== typeFilter) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        let valueA, valueB;
        
        // Handle special cases
        switch (sortField) {
          case 'threat_level':
            // Map threat levels to numerical values for sorting
            const threatLevels = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
            valueA = threatLevels[a.threat_level] || 0;
            valueB = threatLevels[b.threat_level] || 0;
            break;
            
          case 'signal_strength':
            valueA = a.signal_strength || 0;
            valueB = b.signal_strength || 0;
            break;
            
          case 'speed':
            valueA = a.speed || 0;
            valueB = b.speed || 0;
            break;
            
          default:
            // Default string comparison
            valueA = a[sortField] || '';
            valueB = b[sortField] || '';
            
            // String comparison
            if (typeof valueA === 'string') {
              return sortDirection === 'asc' 
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
            }
        }
        
        // Numerical comparison
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      });
  }, [drones, filter, threatFilter, typeFilter, sortField, sortDirection]);
  
  // Get style for threat level
  const getThreatStyle = (level) => {
    switch (level) {
      case 'none': return { bgColor: 'bg-blue-100', textColor: 'text-blue-800', color: 'blue' };
      case 'low': return { bgColor: 'bg-green-100', textColor: 'text-green-800', color: 'green' };
      case 'medium': return { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', color: 'yellow' };
      case 'high': return { bgColor: 'bg-orange-100', textColor: 'text-orange-800', color: 'orange' };
      case 'critical': return { bgColor: 'bg-red-100', textColor: 'text-red-800', color: 'red' };
      default: return { bgColor: 'bg-gray-100', textColor: 'text-gray-800', color: 'gray' };
    }
  };
  
  // Format speed
  const formatSpeed = (speed) => {
    if (speed === null || speed === undefined) return 'N/A';
    return `${speed.toFixed(1)} m/s`;
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Error';
    }
  };
  
  // Render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <span className="ml-1">▲</span>
      : <span className="ml-1">▼</span>;
  };
  
  // Calculate stats
  const stats = React.useMemo(() => {
    const totalDrones = drones.length;
    const byThreat = {
      none: drones.filter(d => d.threat_level === 'none').length,
      low: drones.filter(d => d.threat_level === 'low').length,
      medium: drones.filter(d => d.threat_level === 'medium').length,
      high: drones.filter(d => d.threat_level === 'high').length,
      critical: drones.filter(d => d.threat_level === 'critical').length,
    };
    
    const highThreatCount = byThreat.high + byThreat.critical;
    
    return {
      total: totalDrones,
      filtered: filteredAndSortedDrones.length,
      byThreat,
      highThreatCount,
    };
  }, [drones, filteredAndSortedDrones]);

  // Render table view
  const renderTableView = () => (
    <div className="overflow-auto h-full">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th 
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('id')}
            >
              <div className="flex items-center">
                ID {renderSortIndicator('id')}
              </div>
            </th>
            <th 
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('type')}
            >
              <div className="flex items-center">
                Type {renderSortIndicator('type')}
              </div>
            </th>
            <th 
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('threat_level')}
            >
              <div className="flex items-center">
                Threat {renderSortIndicator('threat_level')}
              </div>
            </th>
            <th 
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('signal_strength')}
            >
              <div className="flex items-center">
                Signal {renderSortIndicator('signal_strength')}
              </div>
            </th>
            <th 
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('speed')}
            >
              <div className="flex items-center">
                Speed {renderSortIndicator('speed')}
              </div>
            </th>
            <th 
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAndSortedDrones.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-3 py-4 text-center text-gray-500">
                No drones match your filters
              </td>
            </tr>
          ) : (
            filteredAndSortedDrones.map(drone => (
              <tr 
                key={drone.id}
                className={`${selectedDroneId === drone.id ? 'bg-blue-50' : 'hover:bg-gray-50'} cursor-pointer transition-colors`}
                onClick={() => selectDrone(drone.id)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {drone.id}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {drone.type}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getThreatStyle(drone.threat_level).bgColor} ${getThreatStyle(drone.threat_level).textColor}`}>
                    {drone.threat_level}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${Math.max(0, Math.min(100, drone.signal_strength))}%` }}
                      ></div>
                    </div>
                    <span>{Math.round(drone.signal_strength)}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {formatSpeed(drone.speed)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                  {formatTime(drone.timestamp)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
  
  // Render card view
  const renderCardView = () => (
    <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-auto h-full">
      {filteredAndSortedDrones.length === 0 ? (
        <div className="col-span-2 p-4 text-center text-gray-500 bg-white rounded-lg">
          No drones match your filters
        </div>
      ) : (
        filteredAndSortedDrones.map(drone => {
          const threatStyle = getThreatStyle(drone.threat_level);
          
          return (
            <div 
              key={drone.id}
              className={`p-3 rounded-lg shadow-sm border ${selectedDroneId === drone.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} cursor-pointer hover:shadow-md transition-all`}
              onClick={() => selectDrone(drone.id)}
            >
              <div className="flex justify-between items-start">
                <div className="font-medium">#{drone.id}</div>
                <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${threatStyle.bgColor} ${threatStyle.textColor}`}>
                  {drone.threat_level}
                </span>
              </div>
              
              <div className="mt-2 text-sm grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="text-gray-500">Type:</div>
                <div className="font-medium capitalize">{drone.type}</div>
                
                <div className="text-gray-500">Signal:</div>
                <div className="font-medium">{Math.round(drone.signal_strength)}%</div>
                
                <div className="text-gray-500">Speed:</div>
                <div className="font-medium">{formatSpeed(drone.speed)}</div>
                
                <div className="text-gray-500">Updated:</div>
                <div className="font-medium text-xs">{formatTime(drone.timestamp)}</div>
              </div>
              
              {selectedDroneId === drone.id && (
                <div className="mt-2 text-center">
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Selected</span>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="bg-white h-full flex flex-col">
      <div className="bg-gray-100 p-3 border-b">
        <h2 className="text-lg font-bold text-gray-800 flex items-center justify-between">
          <span>Detected Drones</span>
          
          {/* Stats badge with high threat count */}
          {stats.highThreatCount > 0 && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800">
              {stats.highThreatCount} High Threat
            </span>
          )}
        </h2>
        
        {/* Quick stats */}
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-700">
            Total: {stats.total}
          </span>
          {Object.entries(stats.byThreat).map(([level, count]) => {
            if (count === 0) return null;
            const style = getThreatStyle(level);
            return (
              <span 
                key={level} 
                className={`px-2 py-1 rounded-full capitalize ${style.bgColor} ${style.textColor}`}
              >
                {level}: {count}
              </span>
            );
          })}
        </div>
        
        {/* Search and filter controls */}
        <div className="mt-3 space-y-2">
          <div className="flex">
            <input
              type="text"
              placeholder="Search drones..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-l text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button 
              className="px-3 py-1.5 bg-gray-200 border border-l-0 border-gray-300 rounded-r"
              onClick={() => setFilter('')}
              title="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex space-x-2">
            {/* Threat level filter */}
            <select 
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
              value={threatFilter}
              onChange={(e) => setThreatFilter(e.target.value)}
            >
              <option value="all">All Threats</option>
              <option value="none">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            
            {/* Drone type filter */}
            <select 
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {droneTypes
                .filter(type => type !== 'all')
                .map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))
              }
            </select>
            
            {/* View mode toggle */}
            <button
              className="px-2 py-1.5 bg-gray-200 border border-gray-300 rounded"
              onClick={() => setDisplayMode(displayMode === 'table' ? 'cards' : 'table')}
              title={displayMode === 'table' ? 'Switch to card view' : 'Switch to table view'}
            >
              {displayMode === 'table' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Drone list - table or card view */}
      <div className="flex-grow overflow-hidden">
        {displayMode === 'table' ? renderTableView() : renderCardView()}
      </div>
      
      {/* Status bar */}
      <div className="bg-gray-100 p-2 border-t text-xs text-gray-500 flex justify-between items-center">
        <span>
          {stats.filtered} of {stats.total} drones shown
        </span>
        <span>
          {filter || threatFilter !== 'all' || typeFilter !== 'all' ? (
            <button 
              className="text-blue-600 hover:text-blue-800"
              onClick={() => {
                setFilter('');
                setThreatFilter('all');
                setTypeFilter('all');
              }}
            >
              Clear filters
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
};

export default DroneList;