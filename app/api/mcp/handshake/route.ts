import { NextResponse } from 'next/server'
import { registerAgent } from '@/server/agents/auth'
import { createSession } from '@/server/db/database'
import crypto from 'crypto'

export async function POST(request: Request) {
    try {
        const secretHeader = request.headers.get('x-mcp-key') || '';
        const allowed = process.env.MCP_SHARED_SECRET || process.env.ADMIN_API_KEY || '';
        if (!allowed || secretHeader !== allowed) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { agentId, name, title } = body;
        if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

        const tokenRecord = registerAgent(agentId, name);
        const sessionId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        createSession(sessionId, undefined, title || undefined);

        return NextResponse.json({ token: tokenRecord.token, agentId: tokenRecord.agentId, sessionId });
    } catch (e) {
        console.error('MCP handshake error', e)
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
