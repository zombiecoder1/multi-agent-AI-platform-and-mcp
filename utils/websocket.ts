interface WSMessage {
  type: 'question' | 'stream_chunk' | 'response_complete' | 'error' | 'conversation_id' | 'get_agents';
  conversationId?: string;
  sessionId?: string;
  agentId?: string;
  message?: string;
  data?: any;
}

interface WebSocketClientOptions {
  onOpen?: () => void;
  onChunk?: (chunk: string, agentId: string) => void;
  onComplete?: (response: string, agentId: string, conversationId: string) => void;
  onError?: (error: string) => void;
  onConversationId?: (conversationId: string, sessionId: string) => void;
  onAgents?: (agents: any[]) => void;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private options: WebSocketClientOptions = {};
  private isConnected = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(options: WebSocketClientOptions = {}): Promise<void> {
    this.options = options;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          if (this.options.onOpen) {
            this.options.onOpen();
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.handleReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'stream_chunk':
        if (this.options.onChunk && message.data) {
          this.options.onChunk(message.data.chunk, message.data.agentId);
        }
        break;

      case 'response_complete':
        if (this.options.onComplete && message.data) {
          this.options.onComplete(message.data.response, message.data.agentId, message.conversationId || '');
        }
        break;

      case 'error':
        if (this.options.onError && message.data) {
          this.options.onError(message.data.error);
        }
        break;

      case 'conversation_id':
        if (this.options.onConversationId && message.conversationId) {
          this.options.onConversationId(message.conversationId, message.sessionId || '');
        }
        break;

      case 'get_agents':
        if (this.options.onAgents && message.data) {
          this.options.onAgents(message.data.agents);
        }
        break;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnected) {
          this.connect(this.options).catch(console.error);
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  sendQuestion(message: string, agentId: string, sessionId?: string) {
    if (!this.isConnected || !this.ws) {
      console.error('WebSocket is not connected');
      return;
    }

    const wsMessage: WSMessage = {
      type: 'question',
      message,
      agentId,
      sessionId,
    };

    this.ws.send(JSON.stringify(wsMessage));
  }

  getAgents() {
    if (!this.isConnected || !this.ws) {
      console.error('WebSocket is not connected');
      return;
    }

    const wsMessage: WSMessage = {
      type: 'get_agents',
    };

    this.ws.send(JSON.stringify(wsMessage));
  }

  disconnect() {
    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export { WebSocketClient };
export type { WebSocketClientOptions };
