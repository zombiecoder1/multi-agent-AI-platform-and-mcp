import { NextResponse, NextRequest } from 'next/server'
import toolRegistry from '@/server/utils/toolRegistry'

export async function GET(request: NextRequest, context: any) {
    try {
        const params = context.params instanceof Promise ? await context.params : context.params;
        const agentId = params?.agentId;
        const tools = toolRegistry.list();
        // mark which are assigned
        const assigned = (await (toolRegistry as any).hasAgentAccess ? [] : []);
        // We will return all available tools and let admin set assignment via POST
        return NextResponse.json({ tools });
    } catch (e) {
        console.error('Get agent tools error', e)
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}

export async function POST(request: NextRequest, context: any) {
    try {
        const headerKey = request.headers.get('x-admin-key') || '';
        if (!process.env.ADMIN_API_KEY || headerKey !== process.env.ADMIN_API_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const params = context.params instanceof Promise ? await context.params : context.params;
        const body = await request.json();
        const agentId = params?.agentId;
        const tools = body.tools || [];
        // Expected: [{ tool: 'read_file', config: {} }, ...]
        toolRegistry.assignToolsToAgent(agentId, tools);
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('Set agent tools error', e)
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}
