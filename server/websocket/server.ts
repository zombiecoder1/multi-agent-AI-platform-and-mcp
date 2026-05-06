import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { initializeWebSocket } from './handlers';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.WEBSOCKET_PORT || '3001');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const expandDevOrigins = (origins: string[]) => {
  if (process.env.NODE_ENV === 'production') return origins;

  const expanded = new Set(origins);
  for (const origin of origins) {
    try {
      const u = new URL(origin);
      if (u.hostname === 'localhost') {
        const clone = new URL(origin);
        clone.hostname = '127.0.0.1';
        expanded.add(clone.toString().replace(/\/$/, ''));
      }
      if (u.hostname === '127.0.0.1') {
        const clone = new URL(origin);
        clone.hostname = 'localhost';
        expanded.add(clone.toString().replace(/\/$/, ''));
      }
    } catch {
      // ignore invalid URL entries
    }
  }

  return Array.from(expanded);
};

const EFFECTIVE_ALLOWED_ORIGINS = expandDevOrigins(ALLOWED_ORIGINS);

export const createWebSocketServer = () => {
  const server = createServer((req, res) => {
    // Health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }
    
    res.writeHead(404);
    res.end();
  });
  
  const wss = new WebSocketServer({ 
    server,
    verifyClient: (info, cb) => {
      const origin = info.origin || '';
      const isAllowed = EFFECTIVE_ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed));
      
      if (isAllowed || process.env.NODE_ENV === 'production') {
        cb(true);
      } else {
        console.log(`Rejected connection from origin: ${origin}`);
        cb(false, 403, 'Forbidden');
      }
    }
  });
  
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
  
  initializeWebSocket(wss);

  const tryListen = (port: number, attempt: number) => {
    server.listen(port, () => {
      console.log(`WebSocket server running on ws://localhost:${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log(`Allowed origins: ${EFFECTIVE_ALLOWED_ORIGINS.join(', ')}`);
    });
  };

  server.on('error', (error: any) => {
    if (error?.code === 'EADDRINUSE' && process.env.NODE_ENV !== 'production') {
      const currentPort = typeof error?.port === 'number' ? error.port : PORT;
      const nextPort = currentPort + 1;
      console.error(`WebSocket port ${currentPort} is already in use. Retrying on ${nextPort}...`);
      tryListen(nextPort, 1);
      return;
    }

    console.error('WebSocket HTTP server error:', error);
  });

  tryListen(PORT, 0);
  
  return { server, wss };
};
