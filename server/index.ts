import dotenv from 'dotenv';
import { createWebSocketServer } from './websocket/server';
import { db } from './db/database';

// Load environment variables
dotenv.config();

console.log('Starting AI Board Server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('AI Provider:', process.env.AI_PROVIDER || 'ollama');
console.log('Model:', process.env.AI_PROVIDER === 'gemini' ? process.env.GEMINI_MODEL : process.env.OLLAMA_MODEL);

// Initialize database
console.log('Database initialized at:', process.env.DATABASE_PATH || './data/ai_board.db');

// Start WebSocket server
const { server, wss } = createWebSocketServer();

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  wss.close(() => {
    console.log('WebSocket server closed');
    server.close(() => {
      console.log('HTTP server closed');
      db.close();
      console.log('Database connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log('\n✅ AI Board Server is running!');
console.log('Press Ctrl+C to stop\n');
