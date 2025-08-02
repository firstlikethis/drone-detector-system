import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons in React
// We need to manually set the path to marker icons since the default paths in Leaflet don't work in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom drone icons based on threat level
const droneIcons = {
  none: L.divIcon({
    className: 'drone-icon drone-none',
    html: '<div class="drone-marker" style="background-color: #3388ff;"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  }),
  low: L.divIcon({
    className: 'drone-icon drone-low',
    html: '<div class="drone-marker" style="background-color: #33cc33;"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  }),
  medium: L.divIcon({
    className: 'drone-icon drone-medium',
    html: '<div class="drone-marker" style="background-color: #ffcc00;"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }),
  high: L.divIcon({
    className: 'drone-icon drone-high',
    html: '<div class="drone-marker" style="background-color: #ff6600;"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  }),
  critical: L.divIcon({
    className: 'drone-icon drone-critical',
    html: '<div class="drone-marker" style="background-color: #ff0000;"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }),
};

// Component to handle map auto-centering
const MapController = ({ border, drones }) => {
  const map = useMap();

  useEffect(() => {
    if (border && border.center) {
      map.setView(
        [border.center.latitude, border.center.longitude],
        13
      );
    }
  }, [map, border]);

  return null;
};

// Main DroneMap component
const DroneMap = ({ 
  drones = [], 
  alerts = [], 
  border = null,
  onDroneClick,
  selectedDroneId = null,
  followSelected = false
}) => {
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([16.7769, 98.9761]); // Default center (Mae Sot, Thailand)
  const [mapZoom, setMapZoom] = useState(13);

  // Track previous positions for drone trails
  const [droneTrails, setDroneTrails] = useState({});

  // Update drone trails when drones change
  useEffect(() => {
    const newTrails = {...droneTrails};
    
    drones.forEach(drone => {
      if (!newTrails[drone.id]) {
        newTrails[drone.id] = [];
      }
      
      const location = drone.location;
      
      // Add position to trail if it's different from the last one
      const trail = newTrails[drone.id];
      const lastPos = trail.length > 0 ? trail[trail.length - 1] : null;
      
      if (!lastPos || 
          lastPos[0] !== location.latitude || 
          lastPos[1] !== location.longitude) {
        
        // Add new position to trail
        trail.push([location.latitude, location.longitude]);
        
        // Keep only last 10 positions
        if (trail.length > 10) {
          trail.shift();
        }
      }
    });
    
    // Remove trails for drones that no longer exist
    const currentDroneIds = new Set(drones.map(d => d.id));
    Object.keys(newTrails).forEach(id => {
      if (!currentDroneIds.has(id)) {
        delete newTrails[id];
      }
    });
    
    setDroneTrails(newTrails);
  }, [drones]);

  // Follow selected drone if enabled
  useEffect(() => {
    if (followSelected && selectedDroneId && mapRef.current) {
      const drone = drones.find(d => d.id === selectedDroneId);
      if (drone) {
        const map = mapRef.current;
        map.setView(
          [drone.location.latitude, drone.location.longitude],
          map.getZoom()
        );
      }
    }
  }, [drones, selectedDroneId, followSelected]);

  // Calculate border polygon coordinates
  const getBorderPolygon = () => {
    if (!border || !border.center) return null;
    
    const center = [border.center.latitude, border.center.longitude];
    const width = border.width;
    const height = border.height;
    const rotation = border.rotation || 0;
    
    // Calculate corners (clockwise from top-left)
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    // Base corners before rotation
    const corners = [
      [center[0] - halfHeight, center[1] - halfWidth], // Top-left
      [center[0] - halfHeight, center[1] + halfWidth], // Top-right
      [center[0] + halfHeight, center[1] + halfWidth], // Bottom-right
      [center[0] + halfHeight, center[1] - halfWidth], // Bottom-left
    ];
    
    // If rotation is zero, return corners as is
    if (rotation === 0) {
      return corners;
    }
    
    // Apply rotation
    const rotationRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    
    return corners.map(corner => {
      const x = corner[1] - center[1];
      const y = corner[0] - center[0];
      
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      
      return [
        center[0] + rotatedY,
        center[1] + rotatedX,
      ];
    });
  };

  // Get threat color for various elements
  const getThreatColor = (threatLevel) => {
    switch (threatLevel) {
      case 'none': return '#3388ff';
      case 'low': return '#33cc33';
      case 'medium': return '#ffcc00';
      case 'high': return '#ff6600';
      case 'critical': return '#ff0000';
      default: return '#3388ff';
    }
  };

  // Get drone icon based on threat level
  const getDroneIcon = (threatLevel) => {
    return droneIcons[threatLevel] || droneIcons.none;
  };

  // Format drone details for popup
  const formatDroneDetails = (drone) => {
    return (
      <div className="drone-popup">
        <h3 className="font-bold">Drone #{drone.id}</h3>
        <div className="grid grid-cols-2 gap-x-2 text-sm mt-1">
          <span className="font-semibold">Type:</span>
          <span className="capitalize">{drone.type}</span>
          
          <span className="font-semibold">Threat:</span>
          <span className="capitalize">{drone.threat_level}</span>
          
          <span className="font-semibold">Signal:</span>
          <span>{Math.round(drone.signal_strength)}%</span>
          
          <span className="font-semibold">Speed:</span>
          <span>{drone.speed ? `${drone.speed.toFixed(1)} m/s` : 'N/A'}</span>
          
          <span className="font-semibold">Heading:</span>
          <span>{drone.heading ? `${Math.round(drone.heading)}°` : 'N/A'}</span>
          
          <span className="font-semibold">Altitude:</span>
          <span>{drone.location.altitude ? `${Math.round(drone.location.altitude)}m` : 'N/A'}</span>
          
          <span className="font-semibold">Confidence:</span>
          <span>{Math.round(drone.confidence * 100)}%</span>
          
          {drone.metadata && Object.entries(drone.metadata).map(([key, value]) => (
            <React.Fragment key={key}>
              <span className="font-semibold capitalize">{key}:</span>
              <span>{value}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={mapCenter} 
        zoom={mapZoom} 
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Border area */}
        {border && border.center && (
          <>
            {/* Center marker */}
            <Marker 
              position={[border.center.latitude, border.center.longitude]}
              icon={L.divIcon({
                className: 'border-center-icon',
                html: '<div class="w-2 h-2 bg-red-500 rounded-full"></div>',
                iconSize: [8, 8],
                iconAnchor: [4, 4],
              })}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>Border Center</Tooltip>
            </Marker>
            
            {/* Border area */}
            <Circle 
              center={[border.center.latitude, border.center.longitude]}
              radius={Math.min(border.width, border.height) * 50000} // Convert degrees to meters (approximate)
              pathOptions={{
                fillColor: '#3388ff',
                fillOpacity: 0.1,
                color: '#3388ff',
                weight: 2,
              }}
            >
              <Tooltip direction="top">Monitored Area</Tooltip>
            </Circle>
            
            {/* Restricted zone */}
            <Circle 
              center={[border.center.latitude, border.center.longitude]}
              radius={Math.min(border.width, border.height) * 50000 / 6} // 1/6 of the border area
              pathOptions={{
                fillColor: '#ff0000',
                fillOpacity: 0.1,
                color: '#ff0000',
                weight: 2,
                dashArray: '5, 5',
              }}
            >
              <Tooltip direction="top">Restricted Zone</Tooltip>
            </Circle>
          </>
        )}
        
        {/* Drone trails */}
        {Object.entries(droneTrails).map(([droneId, trail]) => {
          if (trail.length < 2) return null;
          
          const drone = drones.find(d => d.id === droneId);
          if (!drone) return null;
          
          return (
            <React.Fragment key={`trail-${droneId}`}>
              {/* Line connecting trail points */}
              <Polyline 
                positions={trail}
                pathOptions={{
                  color: getThreatColor(drone.threat_level),
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '3, 5',
                }}
              />
              
              {/* Small markers for previous positions */}
              {trail.slice(0, -1).map((pos, idx) => (
                <Circle 
                  key={`trail-point-${droneId}-${idx}`}
                  center={pos}
                  radius={5}
                  pathOptions={{
                    fillColor: getThreatColor(drone.threat_level),
                    fillOpacity: 0.4,
                    color: getThreatColor(drone.threat_level),
                    weight: 1,
                  }}
                />
              ))}
            </React.Fragment>
          );
        })}
        
        {/* Drones */}
        {drones.map(drone => (
          <Marker
            key={drone.id}
            position={[drone.location.latitude, drone.location.longitude]}
            icon={getDroneIcon(drone.threat_level)}
            eventHandlers={{
              click: () => onDroneClick && onDroneClick(drone),
            }}
            zIndexOffset={drone.id === selectedDroneId ? 1000 : 0}
          >
            <Tooltip direction="top" permanent={drone.id === selectedDroneId}>
              Drone #{drone.id} ({drone.type})
            </Tooltip>
            <Popup minWidth={200} maxWidth={300}>
              {formatDroneDetails(drone)}
            </Popup>
          </Marker>
        ))}
        
        {/* Recent alerts */}
        {alerts.filter(a => !a.is_acknowledged).slice(0, 5).map(alert => (
          <Circle
            key={`alert-${alert.id}`}
            center={[alert.location.latitude, alert.location.longitude]}
            radius={200}
            pathOptions={{
              color: getThreatColor(alert.threat_level),
              fillColor: getThreatColor(alert.threat_level),
              fillOpacity: 0.3,
              weight: 2,
              dashArray: '5, 5',
            }}
          >
            <Tooltip direction="top" permanent>
              <div className="font-bold">{alert.alert_type.replace('_', ' ').toUpperCase()}</div>
            </Tooltip>
          </Circle>
        ))}
        
        <MapController border={border} drones={drones} />
      </MapContainer>
      
      {/* CSS for drone markers */}
      <style jsx global>{`
        .drone-marker {
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          animation: pulse 2s infinite;
        }
        
        .drone-critical .drone-marker {
          animation: critical-pulse 1s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          50% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.8);
            opacity: 1;
          }
        }
        
        @keyframes critical-pulse {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.8);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default DroneMap;