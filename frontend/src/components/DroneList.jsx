import React, { useState } from 'react';
import { useDroneContext } from '../context/DroneContext';

const DroneList = () => {
  const { drones, selectedDroneId, selectDrone } = useDroneContext();
  const [sortField, setSortField] = useState('threat_level');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');
  
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
  const sortedDrones = [...drones]
    .filter(drone => {
      if (!filter) return true;
      
      const searchLower = filter.toLowerCase();
      return (
        drone.id.toLowerCase().includes(searchLower) ||
        drone.type.toLowerCase().includes(searchLower) ||
        drone.threat_level.toLowerCase().includes(searchLower)
      );
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
  
  // Get style for threat level
  const getThreatStyle = (level) => {
    switch (level) {
      case 'none': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="bg-white h-full flex flex-col">
      <div className="bg-gray-100 p-3 border-b flex flex-col">
        <h2 className="text-lg font-bold text-gray-800">Detected Drones</h2>
        
        <div className="mt-2">
          <input
            type="text"
            placeholder="Filter drones..."
            className="w-full px-3 py-2 border rounded text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-grow overflow-auto">
        {drones.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            No drones detected
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
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
              {sortedDrones.map(drone => (
                <tr 
                  key={drone.id}
                  className={`${selectedDroneId === drone.id ? 'bg-blue-50' : 'hover:bg-gray-50'} cursor-pointer`}
                  onClick={() => selectDrone(drone.id)}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {drone.id}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {drone.type}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getThreatStyle(drone.threat_level)}`}>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="bg-gray-100 p-2 border-t text-xs text-gray-500">
        {drones.length} drones detected | {sortedDrones.length} shown
      </div>
    </div>
  );
};

export default DroneList;