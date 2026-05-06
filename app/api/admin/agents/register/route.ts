import { NextResponse } from 'next/server'
import { registerAgent } from '@/server/agents/auth'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { agentId, name } = body
        if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

        const result = registerAgent(agentId, name)
        return NextResponse.json({ token: result.token, agentId: result.agentId })
    } catch (e) {
        console.error('Register agent error', e)
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}
