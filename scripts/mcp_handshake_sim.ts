// MCP handshake simulator: POST to the Next API MCP handshake endpoint
// Usage: npx ts-node scripts/mcp_handshake_sim.ts <agentId> [name] [title]

const BASE = process.env.MCP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const SECRET = process.env.MCP_SHARED_SECRET || process.env.ADMIN_API_KEY || 'admin-secret'

async function main() {
    const agentId = process.argv[2] || 'techAgent'
    const name = process.argv[3] || 'sim-agent'
    const title = process.argv[4] || 'sim-session'

    const res = await fetch(`${BASE}/api/mcp/handshake`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-mcp-key': SECRET,
        },
        body: JSON.stringify({ agentId, name, title }),
    })

    const data = await res.json()
    if (!res.ok) {
        console.error('Handshake failed', res.status, data)
        process.exit(1)
    }

    console.log(JSON.stringify(data, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
