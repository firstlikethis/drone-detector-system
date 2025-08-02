import React, { useState } from 'react';
import { DroneProvider } from './context/DroneContext';
import DroneMap from './components/DroneMap';
import DroneList from './components/DroneList';
import AlertPanel from './components/AlertPanel';
import ControlPanel from './components/ControlPanel';
import RadarDisplay from './components/RadarDisplay';
import CountermeasurePanel from './components/CountermeasurePanel'; // Import CountermeasurePanel

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/drones';

function App() {
  const [layout, setLayout] = useState('default'); // 'default', 'map-focus', 'data-focus'
  const [followSelected, setFollowSelected] = useState(false);
  const [showRadar, setShowRadar] = useState(false); // Toggle for radar display
  const [showCountermeasures, setShowCountermeasures] = useState(false); // Toggle for countermeasures panel

  // Handle layout changes
  const toggleLayout = (newLayout) => {
    setLayout(current => current === newLayout ? 'default' : newLayout);
  };

  // Layout configurations
  const getLayoutClasses = () => {
    switch (layout) {
      case 'map-focus':
        return {
          map: 'col-span-12 lg:col-span-12 row-span-5',
          drones: 'col-span-12 lg:col-span-6 row-span-1',
          alerts: 'col-span-12 lg:col-span-6 row-span-1',
          controls: 'col-span-12 lg:col-span-12 row-span-1',
        };
      case 'data-focus':
        return {
          map: 'col-span-12 lg:col-span-8 row-span-2',
          drones: 'col-span-12 lg:col-span-4 row-span-3',
          alerts: 'col-span-12 lg:col-span-4 row-span-3',
          controls: 'col-span-12 lg:col-span-8 row-span-2',
        };
      default:
        return {
          map: 'col-span-12 lg:col-span-8 row-span-4',
          drones: 'col-span-12 lg:col-span-4 row-span-2',
          alerts: 'col-span-12 lg:col-span-4 row-span-2',
          controls: 'col-span-12 lg:col-span-4 row-span-2',
        };
    }
  };

  const layoutClasses = getLayoutClasses();

  return (
    <DroneProvider apiBaseUrl={API_BASE_URL} wsUrl={WS_URL}>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 text-white shadow">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
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
            
            <div className="flex space-x-3">
              {/* Layout Controls */}
              <button 
                className={`px-3 py-1 rounded text-sm ${layout === 'map-focus' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                onClick={() => toggleLayout('map-focus')}
                title="Focus on map"
              >
                Map Focus
              </button>
              <button 
                className={`px-3 py-1 rounded text-sm ${layout === 'data-focus' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                onClick={() => toggleLayout('data-focus')}
                title="Focus on data panels"
              >
                Data Focus
              </button>
              <button 
                className={`px-3 py-1 rounded text-sm ${followSelected ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                onClick={() => setFollowSelected(!followSelected)}
                title="Follow selected drone on map"
              >
                {followSelected ? 'Following Drone' : 'Follow Drone'}
              </button>
              <button 
                className={`px-3 py-1 rounded text-sm ${showRadar ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                onClick={() => {
                  setShowRadar(!showRadar);
                  if (showCountermeasures) setShowCountermeasures(false);
                }}
                title="Toggle radar display"
              >
                {showRadar ? 'Hide Radar' : 'Show Radar'}
              </button>
              <button 
                className={`px-3 py-1 rounded text-sm ${showCountermeasures ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                onClick={() => {
                  setShowCountermeasures(!showCountermeasures);
                  if (showRadar) setShowRadar(false);
                }}
                title="Toggle countermeasures panel"
              >
                {showCountermeasures ? 'Hide Countermeasures' : 'Countermeasures'}
              </button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 flex-grow">
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
            {/* Map/Radar/Countermeasures Panel */}
            <div className={`${layoutClasses.map} bg-white rounded-lg shadow overflow-hidden`}>
              {showRadar ? <RadarDisplay /> : 
               showCountermeasures ? <CountermeasurePanel apiBaseUrl={API_BASE_URL} /> :
               <DroneMap followSelected={followSelected} />}
            </div>
            
            {/* Drone List Panel */}
            <div className={`${layoutClasses.drones} rounded-lg shadow overflow-hidden`}>
              <DroneList />
            </div>
            
            {/* Alerts Panel */}
            <div className={`${layoutClasses.alerts} rounded-lg shadow overflow-hidden`}>
              <AlertPanel />
            </div>
            
            {/* Control Panel */}
            <div className={`${layoutClasses.controls} rounded-lg shadow overflow-hidden`}>
              <ControlPanel apiBaseUrl={API_BASE_URL} />
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-800 text-white py-2">
          <div className="container mx-auto px-4 text-center text-sm">
            <p>Drone Detection System — Local Development Version</p>
          </div>
        </footer>
      </div>
    </DroneProvider>
  );
}

export default App;