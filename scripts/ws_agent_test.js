const WebSocket = require('ws');
const url = process.argv[2] || 'ws://localhost:3002';
const token = process.argv[3];

if (!token) {
    console.error('Usage: node scripts/ws_agent_test.js <ws_url> <token>');
    process.exit(1);
}

const originHeader = process.env.WS_ORIGIN || 'http://localhost:3001';
console.log('Using Origin header:', originHeader);
const ws = new WebSocket(url, { headers: { Origin: originHeader } });

ws.on('open', () => {
    console.log('Connected to', url);
    // Authenticate
    ws.send(JSON.stringify({ type: 'agent_auth', token }));

    setTimeout(() => {
        // Call search_repo tool
        const payload = { type: 'tool_call', toolName: 'search_repo', args: { query: 'TODO', maxResults: 5 }, sessionId: null };
        console.log('Sending tool_call:', payload);
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
