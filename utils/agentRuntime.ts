import AgentClient from './agentClient'

export async function mcpHandshake(agentId: string, name: string | undefined, title: string | undefined, mcpKey: string) {
    const res = await fetch('/api/mcp/handshake', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-mcp-key': mcpKey },
        body: JSON.stringify({ agentId, name, title }),
    });
    if (!res.ok) throw new Error(`Handshake failed: ${res.statusText}`);
    return res.json();
}

export class AgentRuntime {
    client: AgentClient | null = null
    token: string | null = null
    sessionId: string | null = null

    constructor(private wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001')) { }

    async connectWithToken(token: string, sessionId?: string) {
        const client = new AgentClient(this.wsUrl)
        await client.connect()
        client.authenticate(token)
        this.client = client
        this.token = token
        this.sessionId = sessionId || null
        return { client, sessionId }
    }

    async handshakeAndConnect(agentId: string, name: string | undefined, title: string | undefined, mcpKey: string) {
        const data = await mcpHandshake(agentId, name, title, mcpKey)
        const { token, sessionId } = data
        await this.connectWithToken(token, sessionId)
        return { token, sessionId }
    }

    callTool(tool: string, args?: any) {
        if (!this.client) throw new Error('Not connected')
        this.client.callTool(tool, args)
    }

    disconnect() {
        if (this.client) this.client.disconnect()
    }
}

export default AgentRuntime
