/**
 * Massive.com (Polygon.io) WebSocket Client
 * Real-time stock market data streaming
 */

type MessageHandler = (data: any) => void;
type ErrorHandler = (error: Error) => void;
type ConnectionHandler = () => void;

interface SubscriptionHandlers {
  onMessage: MessageHandler;
  onError?: ErrorHandler;
  onConnect?: ConnectionHandler;
  onDisconnect?: ConnectionHandler;
}

class MassiveWebSocketClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private url: string;
  private subscriptions: Map<string, SubscriptionHandlers[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private isAuthenticated = false;
  private messageQueue: any[] = [];

  constructor(apiKey: string, realtime: boolean = false) {
    this.apiKey = apiKey;
    // Use real-time endpoint for premium subscribers, delayed for free tier
    this.url = realtime 
      ? 'wss://socket.massive.com/stocks'
      : 'wss://delayed.massive.com/stocks';
  }

  /**
   * Connect to WebSocket and authenticate
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      console.log('[WebSocket] Connecting to:', this.url);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Authenticate
          this.authenticate();
        };

        this.ws.onmessage = (event) => {
          try {
            const messages = JSON.parse(event.data);
            
            // Handle array of messages
            if (Array.isArray(messages)) {
              messages.forEach(msg => this.handleMessage(msg));
            } else {
              this.handleMessage(messages);
            }
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.isConnecting = false;
          
          // Notify all subscribers of error
          this.subscriptions.forEach((handlers) => {
            handlers.forEach(h => h.onError?.(new Error('WebSocket error')));
          });
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.isConnecting = false;
          this.isAuthenticated = false;
          
          // Notify all subscribers of disconnect
          this.subscriptions.forEach((handlers) => {
            handlers.forEach(h => h.onDisconnect?.());
          });

          // Attempt reconnection
          this.attemptReconnect();
        };

        // Set timeout for connection
        setTimeout(() => {
          if (!this.isAuthenticated) {
            reject(new Error('Connection timeout'));
            this.disconnect();
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Authenticate with API key
   */
  private authenticate() {
    const authMessage = {
      action: 'auth',
      params: this.apiKey
    };
    
    console.log('[WebSocket] Authenticating...');
    this.send(authMessage);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any) {
    console.log('[WebSocket] Message:', message);

    // Handle authentication response
    if (message.ev === 'status') {
      if (message.status === 'auth_success') {
        console.log('[WebSocket] Authenticated successfully');
        this.isAuthenticated = true;
        
        // Process queued messages
        this.processMessageQueue();
        
        // Notify all subscribers of connection
        this.subscriptions.forEach((handlers) => {
          handlers.forEach(h => h.onConnect?.());
        });
      } else if (message.status === 'auth_failed') {
        console.error('[WebSocket] Authentication failed:', message.message);
        this.disconnect();
      }
      return;
    }

    // Handle subscription confirmations
    if (message.ev === 'status' && message.message?.includes('subscribed')) {
      console.log('[WebSocket] Subscription confirmed:', message.message);
      return;
    }

    // Handle aggregate data (A prefix for per-second aggregates)
    if (message.ev === 'A') {
      const ticker = message.sym;
      const handlers = this.subscriptions.get(ticker) || [];
      
      handlers.forEach(handler => {
        handler.onMessage({
          ticker,
          price: message.c,        // close price
          open: message.o,         // open price
          high: message.h,         // high price
          low: message.l,          // low price
          volume: message.v,       // volume
          vwap: message.vw,        // volume weighted average price
          timestamp: message.e,    // end timestamp
          accumulated_volume: message.av, // today's accumulated volume
        });
      });
    }
  }

  /**
   * Subscribe to ticker updates
   */
  subscribe(ticker: string, handlers: SubscriptionHandlers) {
    console.log('[WebSocket] Subscribing to:', ticker);

    // Add handlers to subscriptions
    const existing = this.subscriptions.get(ticker) || [];
    existing.push(handlers);
    this.subscriptions.set(ticker, existing);

    // Send subscription message if connected
    if (this.isAuthenticated) {
      const subscribeMessage = {
        action: 'subscribe',
        params: `A.${ticker}` // A = aggregates per second
      };
      this.send(subscribeMessage);
    } else {
      // Queue the subscription until connected
      this.messageQueue.push({
        action: 'subscribe',
        params: `A.${ticker}`
      });
      
      // Connect if not already connecting
      if (!this.isConnecting && !this.ws) {
        this.connect().catch(console.error);
      }
    }

    // Return unsubscribe function
    return () => this.unsubscribe(ticker, handlers);
  }

  /**
   * Unsubscribe from ticker updates
   */
  unsubscribe(ticker: string, handlers: SubscriptionHandlers) {
    console.log('[WebSocket] Unsubscribing from:', ticker);

    const existing = this.subscriptions.get(ticker) || [];
    const filtered = existing.filter(h => h !== handlers);

    if (filtered.length === 0) {
      // No more handlers for this ticker, unsubscribe from WebSocket
      this.subscriptions.delete(ticker);
      
      if (this.isAuthenticated) {
        const unsubscribeMessage = {
          action: 'unsubscribe',
          params: `A.${ticker}`
        };
        this.send(unsubscribeMessage);
      }
    } else {
      this.subscriptions.set(ticker, filtered);
    }
  }

  /**
   * Send message to WebSocket
   */
  private send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send, not connected');
    }
  }

  /**
   * Process queued messages after authentication
   */
  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.subscriptions.size > 0) {
        this.connect().catch(console.error);
      }
    }, delay);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    console.log('[WebSocket] Disconnecting...');
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isAuthenticated = false;
    this.isConnecting = false;
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }
}

// Singleton instance
let wsClient: MassiveWebSocketClient | null = null;

/**
 * Get or create WebSocket client instance
 */
export function getWebSocketClient(apiKey: string, realtime: boolean = true): MassiveWebSocketClient {
  if (!wsClient) {
    wsClient = new MassiveWebSocketClient(apiKey, realtime);
  }
  return wsClient;
}

/**
 * Export the class for direct instantiation if needed
 */
export { MassiveWebSocketClient };
