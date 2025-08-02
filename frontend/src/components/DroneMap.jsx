import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, Polyline, useMap, LayersControl, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDroneContext } from '../context/DroneContext';

// Fix for Leaflet marker icons in React
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

// สร้างไอคอนโดรนแบบพื้นฐาน แต่มีขนาดที่หลากหลายตามระดับภัยคุกคาม
const createDroneIcon = (threatLevel, selected = false) => {
  const colors = {
    none: '#3388ff',
    low: '#33cc33',
    medium: '#ffcc00',
    high: '#ff6600',
    critical: '#ff0000'
  };
  
  const color = colors[threatLevel] || colors.none;
  const size = selected ? 8 : {
    none: 5,
    low: 6,
    medium: 7,
    high: 8,
    critical: 9
  }[threatLevel] || 6;
  
  const borderColor = selected ? 'white' : 'rgba(255, 255, 255, 0.7)';
  const borderWidth = selected ? 2 : 1;
  
  return L.divIcon({
    className: `drone-icon drone-${threatLevel} ${selected ? 'selected' : ''}`,
    html: `<div class="drone-marker" style="
      background-color: ${color}; 
      width: ${size * 2}px; 
      height: ${size * 2}px;
      border: ${borderWidth}px solid ${borderColor};
      box-shadow: 0 0 ${selected ? 8 : 4}px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
  });
};

// สร้างคลังของไอคอนโดรนที่มีหลากหลายรูปแบบเพื่อแยกแยะความแตกต่าง
const droneIconVariants = [
  { offsetX: 0, offsetY: 0 },    // ตำแหน่งกลาง (ค่าเริ่มต้น)
  { offsetX: 8, offsetY: 0 },    // ขยับไปทางขวาเล็กน้อย
  { offsetX: -8, offsetY: 0 },   // ขยับไปทางซ้ายเล็กน้อย
  { offsetX: 0, offsetY: 8 },    // ขยับลงเล็กน้อย
  { offsetX: 0, offsetY: -8 },   // ขยับขึ้นเล็กน้อย
  { offsetX: 6, offsetY: 6 },    // ขยับลงขวาเล็กน้อย
  { offsetX: -6, offsetY: 6 },   // ขยับลงซ้ายเล็กน้อย
  { offsetX: 6, offsetY: -6 },   // ขยับขึ้นขวาเล็กน้อย
  { offsetX: -6, offsetY: -6 },  // ขยับขึ้นซ้ายเล็กน้อย
];

// Component ควบคุมมุมมองแผนที่
const MapController = ({ border, selectedDrone, followSelected }) => {
  const map = useMap();

  // ตั้งค่ามุมมองเริ่มต้นตามพื้นที่ชายแดน
  useEffect(() => {
    if (border && border.center) {
      // คำนวณขอบเขตโดยประมาณ
      const latRadius = border.height / 2;
      const lngRadius = border.width / 2;
      
      const bounds = [
        [border.center.latitude - latRadius, border.center.longitude - lngRadius],
        [border.center.latitude + latRadius, border.center.longitude + lngRadius]
      ];
      
      map.fitBounds(bounds);
    }
  }, [map, border]);

  // ติดตามโดรนที่เลือกถ้าเปิดใช้งาน
  useEffect(() => {
    if (followSelected && selectedDrone && selectedDrone.location) {
      map.setView(
        [selectedDrone.location.latitude, selectedDrone.location.longitude],
        map.getZoom()
      );
    }
  }, [map, selectedDrone, followSelected]);

  return null;
};

// Component สำหรับการควบคุมด้วย UI
const MapControls = ({ onZoomIn, onZoomOut, onReset, onToggleFullscreen }) => {
  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col space-y-2">
      <button
        onClick={onZoomIn}
        className="bg-white shadow-md p-2 rounded-full hover:bg-gray-100"
        title="Zoom In"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
      
      <button
        onClick={onZoomOut}
        className="bg-white shadow-md p-2 rounded-full hover:bg-gray-100"
        title="Zoom Out"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </button>
      
      <button
        onClick={onReset}
        className="bg-white shadow-md p-2 rounded-full hover:bg-gray-100"
        title="Reset View"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
      </button>
      
      <button
        onClick={onToggleFullscreen}
        className="bg-white shadow-md p-2 rounded-full hover:bg-gray-100"
        title="Toggle Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

// Component สำหรับแสดงคำอธิบายและสัญลักษณ์บนแผนที่
const MapLegend = () => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="absolute bottom-6 left-4 z-[1000]">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <button 
          className="flex items-center justify-between w-full px-3 py-2 bg-gray-800 text-white text-sm font-medium"
          onClick={() => setExpanded(!expanded)}
        >
          <span>Map Legend</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transform ${expanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expanded && (
          <div className="p-3 text-sm">
            <h3 className="font-medium mb-2">Threat Levels:</h3>
            <div className="space-y-1">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                <span>None</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
                <span>High</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                <span>Critical</span>
              </div>
            </div>
            
            <h3 className="font-medium mt-3 mb-2">Areas:</h3>
            <div className="space-y-1">
              <div className="flex items-center">
                <div className="w-4 h-4 border border-blue-500 rounded-full mr-2"></div>
                <span>Monitored Area</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 border border-red-500 rounded-full mr-2"></div>
                <span>Restricted Zone</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Component หลัก DroneMap
const DroneMap = ({ followSelected = false }) => {
  const { drones, alerts, border, selectedDroneId, selectDrone } = useDroneContext();
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([
    parseFloat(import.meta.env.VITE_DEFAULT_MAP_CENTER_LAT || '16.7769'),
    parseFloat(import.meta.env.VITE_DEFAULT_MAP_CENTER_LON || '98.9761')
  ]);
  const [mapZoom, setMapZoom] = useState(parseInt(import.meta.env.VITE_DEFAULT_MAP_ZOOM || '13'));
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // เก็บประวัติตำแหน่งของโดรนสำหรับแสดงเส้นทางการเคลื่อนที่
  const [droneTrails, setDroneTrails] = useState({});
  
  // จัดการโดรนที่อยู่ซ้อนทับกัน
  const [droneOffsets, setDroneOffsets] = useState({});

  // หาโดรนที่เลือก
  const selectedDrone = drones.find(d => d.id === selectedDroneId);

  // อัปเดตเส้นทางโดรนเมื่อข้อมูลโดรนเปลี่ยนแปลง
  useEffect(() => {
    const newTrails = {...droneTrails};
    const dronePositions = new Map(); // ใช้สำหรับตรวจสอบการซ้อนทับ
    const newOffsets = {}; // ค่า offset ใหม่สำหรับโดรนที่ซ้อนทับกัน
    
    // ปรับปรุงเส้นทางโดรนและตรวจสอบการซ้อนทับ
    drones.forEach(drone => {
      if (!newTrails[drone.id]) {
        newTrails[drone.id] = [];
      }
      
      const location = drone.location;
      const posKey = `${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`;
      
      // เพิ่มตำแหน่งในการติดตามการซ้อนทับ
      if (!dronePositions.has(posKey)) {
        dronePositions.set(posKey, [drone.id]);
        newOffsets[drone.id] = 0; // ไม่มี offset สำหรับโดรนตัวแรกในตำแหน่งนี้
      } else {
        // มีโดรนอื่นอยู่ในตำแหน่งเดียวกันแล้ว
        const droneIdsAtPosition = dronePositions.get(posKey);
        droneIdsAtPosition.push(drone.id);
        
        // กำหนด offset ตามตำแหน่งในอาร์เรย์
        const offsetIndex = (droneIdsAtPosition.length - 1) % droneIconVariants.length;
        newOffsets[drone.id] = offsetIndex;
      }
      
      // เพิ่มตำแหน่งในเส้นทาง
      const trail = newTrails[drone.id];
      const lastPos = trail.length > 0 ? trail[trail.length - 1] : null;
      
      // เพิ่มตำแหน่งใหม่ถ้าไม่ซ้ำกับตำแหน่งล่าสุด
      if (!lastPos || 
          Math.abs(lastPos[0] - location.latitude) > 0.00001 || 
          Math.abs(lastPos[1] - location.longitude) > 0.00001) {
        
        trail.push([location.latitude, location.longitude]);
        
        // เก็บเฉพาะ 20 ตำแหน่งล่าสุด
        if (trail.length > 20) {
          trail.shift();
        }
      }
    });
    
    // ลบเส้นทางของโดรนที่ไม่มีอยู่แล้ว
    const currentDroneIds = new Set(drones.map(d => d.id));
    Object.keys(newTrails).forEach(id => {
      if (!currentDroneIds.has(id)) {
        delete newTrails[id];
      }
    });
    
    setDroneTrails(newTrails);
    setDroneOffsets(newOffsets);
  }, [drones]);

  // จัดการการขยายเต็มจอ
  const toggleFullscreen = () => {
    const mapContainer = document.getElementById('map-container');
    if (!document.fullscreenElement) {
      if (mapContainer.requestFullscreen) {
        mapContainer.requestFullscreen();
      } else if (mapContainer.mozRequestFullScreen) { /* Firefox */
        mapContainer.mozRequestFullScreen();
      } else if (mapContainer.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        mapContainer.webkitRequestFullscreen();
      } else if (mapContainer.msRequestFullscreen) { /* IE/Edge */
        mapContainer.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) { /* Chrome, Safari & Opera */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE/Edge */
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // ฟังก์ชันขยายและย่อแผนที่
  const handleZoomIn = () => {
    const map = mapRef.current;
    if (map) {
      map.setZoom(map.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (map) {
      map.setZoom(map.getZoom() - 1);
    }
  };

  const handleResetView = () => {
    const map = mapRef.current;
    if (map && border && border.center) {
      // คำนวณขอบเขตโดยประมาณ
      const latRadius = border.height / 2;
      const lngRadius = border.width / 2;
      
      const bounds = [
        [border.center.latitude - latRadius, border.center.longitude - lngRadius],
        [border.center.latitude + latRadius, border.center.longitude + lngRadius]
      ];
      
      map.fitBounds(bounds);
    }
  };

  // สีสำหรับระดับภัยคุกคาม
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

  // แสดงรายละเอียดโดรนในป๊อปอัป
  const formatDroneDetails = (drone) => {
    return (
      <div className="drone-popup">
        <h3 className="font-bold text-base">Drone #{drone.id}</h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm mt-2">
          <span className="font-semibold">Type:</span>
          <span className="capitalize">{drone.type}</span>
          
          <span className="font-semibold">Threat:</span>
          <span className="capitalize flex items-center">
            <span className={`inline-block w-3 h-3 rounded-full mr-1 bg-${drone.threat_level === 'none' ? 'blue' : drone.threat_level === 'low' ? 'green' : drone.threat_level === 'medium' ? 'yellow' : drone.threat_level === 'high' ? 'orange' : 'red'}-500`}></span>
            {drone.threat_level}
          </span>
          
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
        
        <div className="mt-3 text-center">
          <button 
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
            onClick={(e) => {
              e.stopPropagation(); // ป้องกันการปิดป๊อปอัป
              selectDrone(drone.id);
            }}
          >
            {selectedDroneId === drone.id ? 'Selected' : 'Select Drone'}
          </button>
        </div>
      </div>
    );
  };

  // จัดการการคลิกที่โดรน
  const handleDroneClick = (drone) => {
    selectDrone(drone.id);
  };

  // คำนวณตำแหน่งที่แสดงผลโดรน (ใช้ offset สำหรับโดรนที่ซ้อนทับกัน)
  const getDronePosition = (drone, offsetIndex = 0) => {
    const variant = droneIconVariants[offsetIndex];
    if (!variant) return [drone.location.latitude, drone.location.longitude];
    
    // คำนวณตำแหน่งใหม่โดยใช้ offset (แปลงเป็นองศาละติจูด/ลองจิจูด โดยประมาณ)
    // 0.0001 องศา ≈ 11 เมตร
    const offsetScale = 0.00005; // ประมาณ 5.5 เมตร
    
    return [
      drone.location.latitude + variant.offsetY * offsetScale,
      drone.location.longitude + variant.offsetX * offsetScale
    ];
  };

  return (
    <div id="map-container" className="h-full w-full relative">
      <MapContainer 
        center={mapCenter} 
        zoom={mapZoom} 
        style={{ height: '100%', width: '100%' }}
        whenCreated={(map) => { mapRef.current = map; }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenTopoMap">
            <TileLayer
              attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          
          {/* Layers เสริม */}
          <LayersControl.Overlay checked name="Border">
            <LayerGroup>
              {border && border.center && (
                <>
                  {/* จุดศูนย์กลางพื้นที่ชายแดน */}
                  <Marker 
                    position={[border.center.latitude, border.center.longitude]}
                    icon={L.divIcon({
                      className: 'border-center-icon',
                      html: '<div class="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>',
                      iconSize: [12, 12],
                      iconAnchor: [6, 6],
                    })}
                  >
                    <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>Border Center</Tooltip>
                  </Marker>
                  
                  {/* พื้นที่ตรวจจับ */}
                  <Circle 
                    center={[border.center.latitude, border.center.longitude]}
                    radius={Math.min(border.width, border.height) * 50000} // แปลงหน่วยองศาเป็นเมตรโดยประมาณ
                    pathOptions={{
                      fillColor: '#3388ff',
                      fillOpacity: 0.05,
                      color: '#3388ff',
                      weight: 2,
                    }}
                  >
                    <Tooltip direction="top">Monitored Area</Tooltip>
                  </Circle>
                  
                  {/* พื้นที่หวงห้าม */}
                  <Circle 
                    center={[border.center.latitude, border.center.longitude]}
                    radius={Math.min(border.width, border.height) * 50000 / 6} // 1/6 ของพื้นที่ตรวจจับ
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
            </LayerGroup>
          </LayersControl.Overlay>
          
          <LayersControl.Overlay checked name="Drone Trails">
            <LayerGroup>
              {/* เส้นทางการเคลื่อนที่ของโดรน */}
              {Object.entries(droneTrails).map(([droneId, trail]) => {
                if (trail.length < 2) return null;
                
                const drone = drones.find(d => d.id === droneId);
                if (!drone) return null;
                
                return (
                  <React.Fragment key={`trail-${droneId}`}>
                    {/* เส้นเชื่อมตำแหน่งโดรน */}
                    <Polyline 
                      positions={trail}
                      pathOptions={{
                        color: getThreatColor(drone.threat_level),
                        weight: drone.id === selectedDroneId ? 3 : 2,
                        opacity: drone.id === selectedDroneId ? 0.8 : 0.5,
                        dashArray: '3, 5',
                      }}
                    />
                    
                    {/* จุดแสดงตำแหน่งก่อนหน้า */}
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
            </LayerGroup>
          </LayersControl.Overlay>
          
          <LayersControl.Overlay checked name="Alerts">
            <LayerGroup>
              {/* การแจ้งเตือน */}
              {alerts.filter(a => !a.is_acknowledged).slice(0, 10).map(alert => (
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
                    <div className="font-bold">{alert.alert_type.replace(/_/g, ' ').toUpperCase()}</div>
                  </Tooltip>
                </Circle>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
        
        {/* โดรน */}
        {drones.map(drone => {
          const isSelected = drone.id === selectedDroneId;
          const offsetIndex = droneOffsets[drone.id] || 0;
          const position = getDronePosition(drone, offsetIndex);
          
          return (
            <Marker
              key={drone.id}
              position={position}
              icon={createDroneIcon(drone.threat_level, isSelected)}
              eventHandlers={{
                click: () => handleDroneClick(drone),
              }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Tooltip 
                direction="top" 
                permanent={isSelected}
                className={`${isSelected ? 'font-medium' : 'text-xs'}`}
              >
                #{drone.id} ({drone.type})
              </Tooltip>
              <Popup minWidth={250} maxWidth={320}>
                {formatDroneDetails(drone)}
              </Popup>
            </Marker>
          );
        })}
        
        {/* ส่วนควบคุมมุมมองแผนที่ */}
        <MapController 
          border={border} 
          selectedDrone={selectedDrone} 
          followSelected={followSelected} 
        />
      </MapContainer>
      
      {/* ปุ่มควบคุมแผนที่ */}
      <MapControls 
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
        onToggleFullscreen={toggleFullscreen}
      />
      
      {/* คำอธิบายแผนที่ */}
      <MapLegend />
      
      {/* ป้ายแสดงสถานะการติดตามโดรน */}
      {followSelected && selectedDroneId && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-full shadow-md text-sm">
          Following Drone #{selectedDroneId}
        </div>
      )}
      
      {/* CSS สำหรับโดรน */}
      <style jsx global>{`
        .drone-marker {
          border-radius: 50%;
          animation: pulse 2s infinite;
          transform-origin: center;
        }
        
        .drone-critical .drone-marker {
          animation: critical-pulse 1s infinite;
        }
        
        .selected .drone-marker {
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8), 0 0 12px rgba(0, 0, 0, 0.8);
          z-index: 1000;
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
        
        /* สไตล์สำหรับป๊อปอัป */
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        
        /* สไตล์สำหรับ Layer Control */
        .leaflet-control-layers {
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        /* สไตล์สำหรับโหมดเต็มจอ */
        :fullscreen .leaflet-container {
          height: 100vh;
          width: 100vw;
        }
      `}</style>
    </div>
  );
};

export default DroneMap;