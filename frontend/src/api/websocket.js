/**
 * WebSocket client for real-time drone data
 */

// Default WebSocket URL
const DEFAULT_WS_URL = 'ws://localhost:8000/ws/drones';

class DroneWebSocketClient {
  constructor(url = DEFAULT_WS_URL) {
    this.url = url;
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.reconnectDelay = 1000; // Start with 1 second
    this.handlers = {
      drones: [],
      alerts: [],
      connection: [],
      error: []
    };
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    try {
      console.log(`Connecting to WebSocket at ${this.url}`);
      this.socket = new WebSocket(this.url);

      this.socket.onopen = this._handleOpen.bind(this);
      this.socket.onclose = this._handleClose.bind(this);
      this.socket.onerror = this._handleError.bind(this);
      this.socket.onmessage = this._handleMessage.bind(this);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this._notifyHandlers('error', error);
      this._scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (!this.socket) {
      return;
    }

    try {
      this.socket.close();
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }

    this.socket = null;
    this.isConnected = false;
    this._notifyHandlers('connection', { connected: false });
  }

  /**
   * Send a message to the server
   * @param {Object} data - Data to send
   */
  send(data) {
    if (!this.isConnected) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Register a handler for drone updates
   * @param {Function} handler - Handler function
   */
  onDrones(handler) {
    this.handlers.drones.push(handler);
    return () => {
      this.handlers.drones = this.handlers.drones.filter(h => h !== handler);
    };
  }

  /**
   * Register a handler for alert notifications
   * @param {Function} handler - Handler function
   */
  onAlerts(handler) {
    this.handlers.alerts.push(handler);
    return () => {
      this.handlers.alerts = this.handlers.alerts.filter(h => h !== handler);
    };
  }

  /**
   * Register a handler for connection status changes
   * @param {Function} handler - Handler function
   */
  onConnection(handler) {
    this.handlers.connection.push(handler);
    // Immediately notify with current status
    handler({ connected: this.isConnected });
    return () => {
      this.handlers.connection = this.handlers.connection.filter(h => h !== handler);
    };
  }

  /**
   * Register a handler for errors
   * @param {Function} handler - Handler function
   */
  onError(handler) {
    this.handlers.error.push(handler);
    return () => {
      this.handlers.error = this.handlers.error.filter(h => h !== handler);
    };
  }

  // Private methods
  _handleOpen(event) {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this._notifyHandlers('connection', { connected: true });
    
    // Send a ping message to keep the connection alive
    this._startPingInterval();
  }

  _handleClose(event) {
    console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
    this.isConnected = false;
    this._clearPingInterval();
    this._notifyHandlers('connection', { connected: false });
    this._scheduleReconnect();
  }

  _handleError(error) {
    console.error('WebSocket error:', error);
    this._notifyHandlers('error', error);
  }

  _handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Handle different message types
      switch (message.type) {
        case 'drones':
          this._notifyHandlers('drones', message.data);
          break;
        case 'alert':
          this._notifyHandlers('alerts', message.data);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
    }
  }

  _notifyHandlers(type, data) {
    this.handlers[type].forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${type} handler:`, error);
      }
    });
  }

  _scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  _startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000); // 30 seconds
  }

  _clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Singleton instance
let instance = null;

/**
 * Get a singleton instance of the WebSocket client
 * @param {string} url - WebSocket URL (optional)
 * @returns {DroneWebSocketClient} - WebSocket client instance
 */
export const getDroneWebSocketClient = (url = DEFAULT_WS_URL) => {
  if (!instance) {
    instance = new DroneWebSocketClient(url);
  }

  if (url !== instance.url) {
    // URL changed, create a new instance
    instance.disconnect();
    instance = new DroneWebSocketClient(url);
  }

  return instance;
};

export default getDroneWebSocketClient;