import { useState, useEffect, useRef } from 'react';
import { useDroneContext } from '../context/DroneContext';

const RadarDisplay = () => {
  const { drones, border, selectedDroneId, selectDrone, alerts } = useDroneContext();
  const canvasRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [range, setRange] = useState(100); // Range in km
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [highDetail, setHighDetail] = useState(false);
  const [displayMode, setDisplayMode] = useState('normal'); // 'normal', 'threat', 'signal'
  const animationRef = useRef(null);
  const droneTrailsRef = useRef({});
  
  // Store previous positions for drone trails
  useEffect(() => {
    const trails = droneTrailsRef.current;
    
    drones.forEach(drone => {
      if (!trails[drone.id]) {
        trails[drone.id] = [];
      }
      
      const trail = trails[drone.id];
      const newPoint = { 
        x: drone.location.longitude, 
        y: drone.location.latitude,
        timestamp: new Date(drone.timestamp).getTime()
      };
      
      // Only add point if it's different from the last one
      if (trail.length === 0 || 
          Math.abs(trail[trail.length - 1].x - newPoint.x) > 0.00001 ||
          Math.abs(trail[trail.length - 1].y - newPoint.y) > 0.00001) {
        
        trail.push(newPoint);
        
        // Keep only the last 20 positions
        if (trail.length > 20) {
          trail.shift();
        }
      }
    });
    
    // Remove trails for drones that no longer exist
    Object.keys(trails).forEach(id => {
      if (!drones.some(d => d.id === id)) {
        delete trails[id];
      }
    });
  }, [drones]);

  // Colors for different threat levels
  const threatColors = {
    none: '#3388ff',
    low: '#33cc33',
    medium: '#ffcc00',
    high: '#ff6600',
    critical: '#ff0000'
  };
  
  // Convert geo coordinates to radar coordinates
  const geoToRadar = (lat, lon) => {
    if (!border || !border.center) return { x: 0, y: 0 };

    const centerLat = border.center.latitude;
    const centerLon = border.center.longitude;
    
    // Calculate relative position from center
    const relLat = (lat - centerLat);
    const relLon = (lon - centerLon);
    
    // Scale based on range and zoom
    const scale = 0.8 * zoom; // 80% of radar size
    
    // Convert to radar coordinates (origin at center)
    // The multiplier converts degrees to a relative distance
    // 111 km per degree of latitude at the equator
    const multiplier = scale / (range / 111);
    
    return {
      x: relLon * multiplier,
      y: -relLat * multiplier // Negate y because canvas y increases downward
    };
  };

  // Draw radar display
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Get device pixel ratio for high DPI screens
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas dimensions for high DPI screen
    if (highDetail && dpr > 1) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw radar background
    const gradientBg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width, height) / 2);
    gradientBg.addColorStop(0, '#0a1929');
    gradientBg.addColorStop(1, '#05101e');
    ctx.fillStyle = gradientBg;
    ctx.fillRect(0, 0, width, height);
    
    // Draw radar rings
    const numCircles = 4;
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= numCircles; i++) {
      const radius = (Math.min(width, height) / 2) * (i / numCircles) * 0.95;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add distance label
      if (showGrid) {
        const distanceKm = range * (i / numCircles);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${distanceKm.toFixed(0)} km`, centerX + 5, centerY - radius + 15);
      }
    }
    
    // Draw radar sweep
    const sweepGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width, height) / 2);
    sweepGradient.addColorStop(0, 'rgba(0, 255, 0, 0.5)');
    sweepGradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, Math.min(width, height) / 2, angle - 0.2, angle + 0.2);
    ctx.closePath();
    ctx.fillStyle = sweepGradient;
    ctx.fill();
    
    if (showGrid) {
      // Draw crosshairs
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();
      
      // Draw angle markers (N, E, S, W)
      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const outerRadius = (Math.min(width, height) / 2) * 0.95;
      
      // North
      ctx.fillText('N', centerX, centerY - outerRadius - 10);
      // East
      ctx.fillText('E', centerX + outerRadius + 10, centerY);
      // South
      ctx.fillText('S', centerX, centerY + outerRadius + 10);
      // West
      ctx.fillText('W', centerX - outerRadius - 10, centerY);
    }
    
    // Draw border rectangle if available
    if (border && border.center) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      
      // Calculate border points
      const halfWidth = border.width / 2;
      const halfHeight = border.height / 2;
      
      const topLeft = geoToRadar(
        border.center.latitude + halfHeight,
        border.center.longitude - halfWidth
      );
      const topRight = geoToRadar(
        border.center.latitude + halfHeight,
        border.center.longitude + halfWidth
      );
      const bottomRight = geoToRadar(
        border.center.latitude - halfHeight,
        border.center.longitude + halfWidth
      );
      const bottomLeft = geoToRadar(
        border.center.latitude - halfHeight,
        border.center.longitude - halfWidth
      );
      
      // Draw border rectangle
      ctx.beginPath();
      ctx.moveTo(centerX + topLeft.x * centerX, centerY + topLeft.y * centerY);
      ctx.lineTo(centerX + topRight.x * centerX, centerY + topRight.y * centerY);
      ctx.lineTo(centerX + bottomRight.x * centerX, centerY + bottomRight.y * centerY);
      ctx.lineTo(centerX + bottomLeft.x * centerX, centerY + bottomLeft.y * centerY);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw restricted zone
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.min(width, height) / 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
      ctx.fill();
      
      // Label
      if (showLabels) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Restricted', centerX, centerY - Math.min(width, height) / 12 - 5);
      }
    }
    
    // Draw active alerts
    const recentAlerts = alerts
      .filter(a => !a.is_acknowledged)
      .slice(0, 5); // Only show the 5 most recent alerts
    
    recentAlerts.forEach(alert => {
      const { location, threat_level } = alert;
      const { x, y } = geoToRadar(location.latitude, location.longitude);
      
      // Draw alert pulse
      const alertColor = threatColors[threat_level] || threatColors.none;
      const pulseSizes = [15, 25, 35]; // Different sizes for pulse animation
      
      pulseSizes.forEach((size, index) => {
        const opacity = 0.7 - (index * 0.2); // Decreasing opacity for outer rings
        const animationOffset = Date.now() / (1000 - index * 200); // Different speeds
        const animatedSize = size + 5 * Math.sin(animationOffset);
        
        ctx.beginPath();
        ctx.arc(
          centerX + x * centerX, 
          centerY + y * centerY, 
          animatedSize, 0, Math.PI * 2
        );
        ctx.fillStyle = `${alertColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
      });
    });
    
    // Draw drone trails if enabled
    if (showTrails) {
      Object.entries(droneTrailsRef.current).forEach(([droneId, trail]) => {
        if (trail.length < 2) return;
        
        const drone = drones.find(d => d.id === droneId);
        if (!drone) return;
        
        const color = threatColors[drone.threat_level] || threatColors.none;
        const isSelected = droneId === selectedDroneId;
        
        // Set up trail appearance
        ctx.strokeStyle = isSelected ? color : `${color}80`; // Add transparency for non-selected
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.setLineDash([3, 3]);
        
        // Draw line connecting points
        ctx.beginPath();
        
        let isFirstPoint = true;
        // Use only every other point for optimization if not selected
        const skipFactor = isSelected ? 1 : 2;
        
        trail.forEach((point, index) => {
          if (index % skipFactor !== 0 && index !== trail.length - 1) return;
          
          const { x, y } = geoToRadar(point.y, point.x);
          
          if (isFirstPoint) {
            ctx.moveTo(centerX + x * centerX, centerY + y * centerY);
            isFirstPoint = false;
          } else {
            ctx.lineTo(centerX + x * centerX, centerY + y * centerY);
          }
        });
        
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
    
    // Draw drones
    drones.forEach(drone => {
      const { location, threat_level, id, signal_strength } = drone;
      
      // Skip drones without location
      if (!location) return;
      
      // Convert to radar coordinates
      const { x, y } = geoToRadar(location.latitude, location.longitude);
      
      // Determine if drone is behind sweep (to create trailing effect)
      const droneAngle = Math.atan2(y, x);
      const sweepAngle = angle % (2 * Math.PI);
      const angleDiff = (droneAngle - sweepAngle + 2 * Math.PI) % (2 * Math.PI);
      const isBehindSweep = angleDiff < Math.PI;
      
      // Set drone appearance based on display mode
      const isSelected = id === selectedDroneId;
      let color, size, opacity;
      
      switch (displayMode) {
        case 'threat':
          // Color by threat level
          color = threatColors[threat_level] || threatColors.none;
          size = isSelected ? 8 : {
            none: 4,
            low: 5,
            medium: 6,
            high: 7,
            critical: 8
          }[threat_level] || 5;
          opacity = isBehindSweep ? 1 : 0.6;
          break;
          
        case 'signal':
          // Color by signal strength
          const signalStrength = signal_strength || 0;
          if (signalStrength > 80) {
            color = '#00ff00'; // Strong signal
          } else if (signalStrength > 50) {
            color = '#ffff00'; // Medium signal
          } else if (signalStrength > 20) {
            color = '#ff9900'; // Weak signal
          } else {
            color = '#ff0000'; // Very weak signal
          }
          size = isSelected ? 8 : 5 + (signalStrength / 20);
          opacity = isBehindSweep ? 1 : 0.6;
          break;
          
        default: // normal
          // Default display
          color = isSelected ? '#ffffff' : threatColors[threat_level] || '#3388ff';
          size = isSelected ? 8 : 6;
          opacity = isBehindSweep ? 1 : 0.6;
          break;
      }
      
      // Draw drone blip
      ctx.fillStyle = `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
      
      ctx.beginPath();
      ctx.arc(
        centerX + x * centerX, 
        centerY + y * centerY, 
        size, 0, Math.PI * 2
      );
      ctx.fill();
      
      // Draw pulse effect for selected drone
      if (isSelected) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
          centerX + x * centerX, 
          centerY + y * centerY, 
          size + 5 + 3 * Math.sin(Date.now() / 200), 
          0, Math.PI * 2
        );
        ctx.stroke();
      }
      
      // Add drone ID label
      if (showLabels || isSelected) {
        ctx.fillStyle = 'white';
        ctx.font = isSelected ? '12px Arial' : '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `#${id}`, 
          centerX + x * centerX, 
          centerY + y * centerY - 15
        );
      }
    });
    
    // Update sweep angle
    const updateAngle = () => {
      setAngle(prevAngle => (prevAngle + 0.01) % (Math.PI * 2));
      animationRef.current = requestAnimationFrame(updateAngle);
    };
    
    if (!animationRef.current) {
      animationRef.current = requestAnimationFrame(updateAngle);
    }
    
    // Cleanup animation
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [drones, border, angle, zoom, range, showLabels, showGrid, showTrails, highDetail, displayMode, selectedDroneId, alerts, threatColors]);
  
  // Handle canvas click
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !border || !border.center) return;
    
    // Get click position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to radar coordinates
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const relX = (x - centerX) / centerX;
    const relY = (y - centerY) / centerY;
    
    // Convert to geo coordinates
    // The multiplier converts radar units back to degrees
    const multiplier = (range / 111) / (0.8 * zoom);
    const clickLat = border.center.latitude - (relY * multiplier);
    const clickLon = border.center.longitude + (relX * multiplier);
    
    // Find closest drone
    let closestDrone = null;
    let minDistance = Infinity;
    
    drones.forEach(drone => {
      if (!drone.location) return;
      
      const droneLat = drone.location.latitude;
      const droneLon = drone.location.longitude;
      
      // Calculate squared distance (to avoid square root)
      const distance = 
        Math.pow(droneLat - clickLat, 2) + 
        Math.pow(droneLon - clickLon, 2);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestDrone = drone;
      }
    });
    
    // Threshold for selection (in degrees)
    // This is approximately 1km at the equator
    const threshold = 0.01 / zoom;
    
    if (closestDrone && minDistance < threshold) {
      selectDrone(closestDrone.id);
    }
  };
  
  // Handle zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const handleZoomReset = () => {
    setZoom(1);
    setRange(100);
  };
  
  // Handle range controls
  const handleIncreaseRange = () => {
    setRange(prev => Math.min(prev + 25, 500));
  };
  
  const handleDecreaseRange = () => {
    setRange(prev => Math.max(prev - 25, 25));
  };
  
  // Toggle display mode
  const handleToggleDisplayMode = () => {
    setDisplayMode(current => {
      switch(current) {
        case 'normal': return 'threat';
        case 'threat': return 'signal';
        case 'signal': return 'normal';
        default: return 'normal';
      }
    });
  };

  // Get display mode label
  const getDisplayModeLabel = () => {
    switch(displayMode) {
      case 'normal': return 'Normal';
      case 'threat': return 'Threat';
      case 'signal': return 'Signal';
      default: return 'Normal';
    }
  };

  return (
    <div className="bg-black rounded-lg h-full flex flex-col overflow-hidden">
      <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
          </svg>
          Radar Display
        </h2>
        
        {/* Mode dropdown */}
        <div className="flex items-center">
          <span className="text-xs mr-2">Mode:</span>
          <button 
            className="bg-gray-700 hover:bg-gray-600 text-sm px-2 py-1 rounded flex items-center"
            onClick={handleToggleDisplayMode}
          >
            {getDisplayModeLabel()}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-grow relative flex items-center justify-center bg-black p-1">
        <canvas 
          ref={canvasRef}
          width={500}
          height={500}
          className="w-full h-full rounded-lg"
          onClick={handleCanvasClick}
        />
        
        {/* Drone count */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 rounded px-2 py-1 text-green-400 text-sm">
          <div>Drones: {drones.length}</div>
          <div>Range: {range} km</div>
        </div>
        
        {/* Zoom level */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 rounded px-2 py-1 text-green-400 text-sm">
          <div>Zoom: {zoom.toFixed(1)}x</div>
          <div>
            {displayMode === 'threat' ? 'Threat Colors' : 
             displayMode === 'signal' ? 'Signal Strength' : 
             'Normal Mode'}
          </div>
        </div>
        
        {/* Selected drone info */}
        {selectedDroneId && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded-lg p-2 text-white text-sm border border-gray-700">
            <div className="font-medium">Selected: #{selectedDroneId}</div>
            {drones.find(d => d.id === selectedDroneId) && (
              <div className="text-xs grid grid-cols-2 gap-x-3 mt-1">
                <span>Type:</span>
                <span className="font-medium capitalize">
                  {drones.find(d => d.id === selectedDroneId).type}
                </span>
                
                <span>Threat:</span>
                <span className="font-medium capitalize">
                  {drones.find(d => d.id === selectedDroneId).threat_level}
                </span>
                
                <span>Signal:</span>
                <span className="font-medium">
                  {Math.round(drones.find(d => d.id === selectedDroneId).signal_strength)}%
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Zoom controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <button
            onClick={handleZoomIn}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-green-400 p-2 rounded"
            title="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleZoomReset}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-green-400 p-2 rounded"
            title="Reset View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-green-400 p-2 rounded"
            title="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Range controls */}
        <div className="absolute top-1/2 transform -translate-y-1/2 right-4 flex flex-col space-y-2">
          <button
            onClick={handleIncreaseRange}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-green-400 p-2 rounded"
            title="Increase Range"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleDecreaseRange}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-green-400 p-2 rounded"
            title="Decrease Range"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Display options */}
      <div className="bg-gray-800 p-2 border-t border-gray-700 flex justify-center space-x-4">
        <label className="flex items-center text-xs text-gray-300">
          <input 
            type="checkbox"
            className="mr-1 form-checkbox h-3 w-3"
            checked={showLabels}
            onChange={() => setShowLabels(!showLabels)}
          />
          Labels
        </label>
        <label className="flex items-center text-xs text-gray-300">
          <input 
            type="checkbox"
            className="mr-1 form-checkbox h-3 w-3"
            checked={showGrid}
            onChange={() => setShowGrid(!showGrid)}
          />
          Grid
        </label>
        <label className="flex items-center text-xs text-gray-300">
          <input 
            type="checkbox"
            className="mr-1 form-checkbox h-3 w-3"
            checked={showTrails}
            onChange={() => setShowTrails(!showTrails)}
          />
          Trails
        </label>
        <label className="flex items-center text-xs text-gray-300">
          <input 
            type="checkbox"
            className="mr-1 form-checkbox h-3 w-3"
            checked={highDetail}
            onChange={() => setHighDetail(!highDetail)}
          />
          High Detail
        </label>
      </div>
    </div>
  );
};

export default RadarDisplay;