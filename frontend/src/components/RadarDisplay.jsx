import { useState, useEffect, useRef } from 'react';
import { useDroneContext } from '../context/DroneContext';

const RadarDisplay = () => {
  const { drones, border, selectedDroneId, selectDrone } = useDroneContext();
  const canvasRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  const animationRef = useRef(null);

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
    
    // Calculate max range in degrees
    const maxRange = Math.max(border.width, border.height) / 2;
    
    // Calculate relative position from center
    const relLat = (lat - centerLat) / maxRange;
    const relLon = (lon - centerLon) / maxRange;
    
    // Apply scaling
    const scale = 0.8 * zoom; // 80% of radar size, adjusted by zoom
    
    // Convert to radar coordinates (origin at center)
    return {
      x: relLon * scale,
      y: -relLat * scale // Negate because y-axis is inverted in canvas
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
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw radar background (dark)
    ctx.fillStyle = '#0a1929';
    ctx.fillRect(0, 0, width, height);
    
    // Draw radar circles
    const numCircles = 4;
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= numCircles; i++) {
      const radius = (Math.min(width, height) / 2) * (i / numCircles) * 0.95;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add distance label
      if (border && border.center) {
        const distanceKm = Math.max(border.width, border.height) * 111 * (i / numCircles) / 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${distanceKm.toFixed(1)} km`, centerX + 5, centerY - radius + 15);
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
    
    // Draw crosshairs
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    
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
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Restricted', centerX, centerY - Math.min(width, height) / 12 - 5);
    }
    
    // Draw drones
    drones.forEach(drone => {
      const { location, threat_level, id } = drone;
      
      // Skip drones without location
      if (!location) return;
      
      // Convert to radar coordinates
      const { x, y } = geoToRadar(location.latitude, location.longitude);
      
      // Determine if drone is behind sweep (to create trailing effect)
      const droneAngle = Math.atan2(y, x);
      const sweepAngle = angle % (2 * Math.PI);
      const angleDiff = (droneAngle - sweepAngle + 2 * Math.PI) % (2 * Math.PI);
      const isBehindSweep = angleDiff < Math.PI;
      
      // Set drone appearance based on threat level and selection
      const isSelected = id === selectedDroneId;
      const color = threatColors[threat_level] || threatColors.none;
      const size = isSelected ? 8 : 6;
      
      // Draw drone blip
      ctx.fillStyle = isBehindSweep 
        ? color 
        : `${color}80`; // Add transparency if in front of sweep
      
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
        
        // Add drone ID label
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
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
  }, [drones, border, angle, zoom, selectedDroneId, threatColors]);
  
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
    
    // Calculate max range in degrees
    const maxRange = Math.max(border.width, border.height) / 2;
    
    // Convert to geo coordinates
    const clickLat = border.center.latitude - (relY / zoom) * maxRange;
    const clickLon = border.center.longitude + (relX / zoom) * maxRange;
    
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
    
    // Threshold for selection (in radar units)
    const threshold = 0.05 / zoom;
    
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
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
        <h2 className="text-lg font-bold">Radar Display</h2>
        <div className="flex space-x-2">
          <button 
            className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
            onClick={handleZoomReset}
            title="Reset zoom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-grow relative flex items-center justify-center bg-black p-2">
        <canvas 
          ref={canvasRef}
          width={500}
          height={500}
          className="w-full h-full rounded"
          onClick={handleCanvasClick}
        />
        
        {/* Drone count */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 rounded px-2 py-1 text-green-400 text-sm">
          Drones: {drones.length}
        </div>
        
        {/* Zoom level */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 rounded px-2 py-1 text-green-400 text-sm">
          Zoom: {zoom.toFixed(1)}x
        </div>
        
        {/* Selected drone info */}
        {selectedDroneId && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded px-2 py-1 text-white text-sm">
            Selected: #{selectedDroneId}
          </div>
        )}
      </div>
    </div>
  );
};

export default RadarDisplay;