// Simple test client for the server WebSocket (ws).
// Usage: node scripts/test_ws.js <ws_url> <agentId> [sessionId]
// Example: node scripts/test_ws.js ws://localhost:3001 marketing_agent

const WebSocket = require('ws');
const [, , url, agentId, sessionId] = process.argv;

if (!url || !agentId) {
    console.error('Usage: node scripts/test_ws.js <ws_url> <agentId> [sessionId]');
    process.exit(1);
}

const ws = new WebSocket(url);

ws.on('open', () => {
    console.log('Connected to', url);
    // Request agents list first
    ws.send(JSON.stringify({ type: 'get_agents' }));

    setTimeout(() => {
        const message = 'টেস্ট: আপনি কিভাবে একটি ছোট বিজনেস স্কেল করবেন?';
        const payload = { type: 'question', message, agentId, sessionId };
        console.log('Sending question:', payload);
        ws.send(JSON.stringify(payload));
    }, 500);
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        console.log('RECV>', msg.type, JSON.stringify(msg.data || { conversationId: msg.conversationId, sessionId: msg.sessionId }));
    } catch (e) {
        console.log('RECV RAW>', data.toString());
    }
});

ws.on('close', () => console.log('Disconnected'));
ws.on('error', (err) => console.error('WS:error', err));
