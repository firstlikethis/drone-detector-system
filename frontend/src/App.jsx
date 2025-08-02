import React, { useState, useEffect } from 'react';
import { DroneProvider } from './context/DroneContext';
import DroneMap from './components/DroneMap';
import DroneList from './components/DroneList';
import AlertPanel from './components/AlertPanel';
import ControlPanel from './components/ControlPanel';
import RadarDisplay from './components/RadarDisplay';
import CountermeasurePanel from './components/CountermeasurePanel';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/drones';

function App() {
  const [layout, setLayout] = useState('default'); // 'default', 'map-focus', 'data-focus'
  const [followSelected, setFollowSelected] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showCountermeasures, setShowCountermeasures] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // ตรวจจับการเปลี่ยนแปลงขนาดหน้าจอ
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // คำนวณคลาสสำหรับ layout ต่างๆ
  const getLayoutClasses = () => {
    // Mobile layout
    if (isMobile) {
      return {
        mainContent: sidebarOpen ? 'hidden' : 'flex-1',
        sidebar: sidebarOpen ? 'w-full' : 'hidden',
      };
    }
    
    // Desktop layouts
    switch (layout) {
      case 'map-focus':
        return {
          mainContent: 'flex-1',
          sidebar: 'w-80 lg:w-96 hidden lg:block',
        };
      case 'data-focus':
        return {
          mainContent: 'flex-1 lg:w-1/2',
          sidebar: 'w-80 lg:w-1/2',
        };
      default:
        return {
          mainContent: 'flex-1 lg:w-2/3',
          sidebar: 'w-80 lg:w-1/3',
        };
    }
  };

  const layoutClasses = getLayoutClasses();

  return (
    <DroneProvider apiBaseUrl={API_BASE_URL} wsUrl={WS_URL}>
      <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 text-white shadow-md z-10">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <button 
                className="mr-3 lg:hidden text-white"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8 mr-2 text-blue-400" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 12v9"></path>
                <path d="M3 12h18"></path>
                <path d="M12 3L9 9h6l-3-6z"></path>
              </svg>
              <h1 className="text-xl font-bold">Drone Detection System</h1>
            </div>
            
            <div className="flex space-x-2">
              {/* Layout Controls */}
              <div className="hidden md:flex space-x-2">
                <button 
                  className={`px-3 py-1 rounded text-sm ${layout === 'map-focus' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                  onClick={() => setLayout('map-focus')}
                  title="Focus on map"
                >
                  <span className="hidden sm:inline">Map Focus</span>
                  <span className="sm:hidden">Map</span>
                </button>
                <button 
                  className={`px-3 py-1 rounded text-sm ${layout === 'data-focus' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                  onClick={() => setLayout('data-focus')}
                  title="Focus on data panels"
                >
                  <span className="hidden sm:inline">Data Focus</span>
                  <span className="sm:hidden">Data</span>
                </button>
              </div>
              
              <button 
                className={`px-3 py-1 rounded text-sm ${followSelected ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                onClick={() => setFollowSelected(!followSelected)}
                title="Follow selected drone on map"
              >
                <span className="hidden sm:inline">{followSelected ? 'Following' : 'Follow'}</span>
                <span className="sm:hidden">F</span>
              </button>
              <button 
                className={`px-3 py-1 rounded text-sm ${showRadar ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                onClick={() => {
                  setShowRadar(!showRadar);
                  if (showCountermeasures) setShowCountermeasures(false);
                }}
                title="Toggle radar display"
              >
                <span className="hidden sm:inline">{showRadar ? 'Map' : 'Radar'}</span>
                <span className="sm:hidden">R</span>
              </button>
              <button 
                className={`px-3 py-1 rounded text-sm ${showCountermeasures ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                onClick={() => {
                  setShowCountermeasures(!showCountermeasures);
                  if (showRadar) setShowRadar(false);
                }}
                title="Toggle countermeasures panel"
              >
                <span className="hidden sm:inline">Counter</span>
                <span className="sm:hidden">C</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex flex-1 overflow-hidden">
          {/* Main Content: Map/Radar/Countermeasures */}
          <div className={`${layoutClasses.mainContent} flex flex-col overflow-hidden`}>
            <div className="flex-1 overflow-hidden">
              {showRadar ? <RadarDisplay /> : 
               showCountermeasures ? <CountermeasurePanel apiBaseUrl={API_BASE_URL} /> :
               <DroneMap followSelected={followSelected} />}
            </div>
            
            {/* Mobile Controls for showing sidebar */}
            <div className="lg:hidden flex justify-center bg-gray-200 py-2">
              <button 
                className="px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md"
                onClick={() => setSidebarOpen(true)}
              >
                Show Controls & Alerts
              </button>
            </div>
          </div>
          
          {/* Sidebar: Controls, Drone List, Alerts */}
          <div className={`${layoutClasses.sidebar} flex flex-col bg-gray-200 overflow-hidden border-l border-gray-300`}>
            {/* Mobile header with close button */}
            {isMobile && (
              <div className="flex justify-between items-center bg-gray-700 text-white p-2">
                <h2 className="font-medium">Control Panel</h2>
                <button 
                  className="p-1 hover:bg-gray-600 rounded"
                  onClick={() => setSidebarOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Tabs system for mobile */}
            {isMobile ? (
              <MobileTabs 
                apiBaseUrl={API_BASE_URL} 
                onClose={() => setSidebarOpen(false)} 
              />
            ) : (
              /* Desktop layout with all panels */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ControlPanel apiBaseUrl={API_BASE_URL} />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <DroneList />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <AlertPanel />
                </div>
              </div>
            )}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-800 text-white py-1 text-xs text-center">
          Drone Detection System — Local Development Version
        </footer>
      </div>
    </DroneProvider>
  );
}

// Mobile Tabs Component
function MobileTabs({ apiBaseUrl, onClose }) {
  const [activeTab, setActiveTab] = useState('control');
  
  return (
    <div className="flex flex-col h-full">
      {/* Tab navigation */}
      <div className="flex border-b border-gray-300">
        <button 
          className={`flex-1 py-2 text-center ${activeTab === 'control' ? 'bg-white font-medium' : 'bg-gray-100'}`}
          onClick={() => setActiveTab('control')}
        >
          Controls
        </button>
        <button 
          className={`flex-1 py-2 text-center ${activeTab === 'drones' ? 'bg-white font-medium' : 'bg-gray-100'}`}
          onClick={() => setActiveTab('drones')}
        >
          Drones
        </button>
        <button 
          className={`flex-1 py-2 text-center ${activeTab === 'alerts' ? 'bg-white font-medium' : 'bg-gray-100'}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts
        </button>
      </div>
      
      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'control' && <ControlPanel apiBaseUrl={apiBaseUrl} />}
        {activeTab === 'drones' && <DroneList />}
        {activeTab === 'alerts' && <AlertPanel />}
      </div>
      
      {/* Bottom action bar */}
      <div className="p-2 bg-gray-300 border-t border-gray-400">
        <button 
          className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded shadow"
          onClick={onClose}
        >
          Return to Map
        </button>
      </div>
    </div>
  );
}

export default App;