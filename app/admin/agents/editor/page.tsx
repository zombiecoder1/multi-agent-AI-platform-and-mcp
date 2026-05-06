"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AgentClient from '@/utils/agentClient'
import AgentRuntime from '@/utils/agentRuntime'

export default function AgentEditorPage() {
    const [token, setToken] = useState('')
    const [agentIdInput, setAgentIdInput] = useState('marketing_agent')
    const [mcpKey, setMcpKey] = useState('')
    const [connected, setConnected] = useState(false)
    const [results, setResults] = useState<any[]>([])
    const [query, setQuery] = useState('')
    const [code, setCode] = useState('// type your snippet here')

    const clientRef = useRef<AgentClient | null>(null)
    const runtimeRef = useRef<AgentRuntime | null>(null)

    const connect = async () => {
        const url = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001')
        const client = new AgentClient(url)
        clientRef.current = client
        await client.connect({
            onOpen: () => setConnected(true),
            onToolResult: (tool, result) => {
                setResults(prev => [{ tool, result }, ...prev])
            },
            onError: (err) => console.error('AgentClient error', err),
        })
    }

    const doAuth = () => {
        if (!clientRef.current) return
        clientRef.current.authenticate(token)
    }

    const handshakeAndConnect = async () => {
        if (!agentIdInput || !mcpKey) return
        try {
            const runtime = new AgentRuntime()
            runtimeRef.current = runtime
            const { token: newToken, sessionId } = await runtime.handshakeAndConnect(agentIdInput, undefined, undefined, mcpKey)
            setToken(newToken)
            // connect clientRef for tool calls
            const client = new AgentClient((process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'))
            clientRef.current = client
            await client.connect({ onOpen: () => setConnected(true), onToolResult: (tool, result) => setResults(prev => [{ tool, result }, ...prev]) })
            client.authenticate(newToken)
        } catch (e) {
            console.error('Handshake error', e)
        }
    }

    const callSearch = () => {
        if (!clientRef.current) return
        clientRef.current.callTool('search_repo', { query })
    }

    const callSave = () => {
        if (!clientRef.current) return
        clientRef.current.callTool('save_snippet', { code, filename: `snippet-${Date.now()}.txt` })
    }

    const callLLM = () => {
        if (!clientRef.current) return
        clientRef.current.callTool('invoke_llm', { prompt: code })
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl mb-4">Agent Code Editor & Tools</h2>

            <div className="mb-4 flex gap-2">
                <Input placeholder="Agent token" value={token} onChange={(e) => setToken((e.target as HTMLInputElement).value)} />
                <Input placeholder="Agent ID (for MCP)" value={agentIdInput} onChange={(e) => setAgentIdInput((e.target as HTMLInputElement).value)} />
                <Input placeholder="MCP Key" value={mcpKey} onChange={(e) => setMcpKey((e.target as HTMLInputElement).value)} />
                <Button onClick={connect} disabled={connected}>Connect</Button>
                <Button onClick={doAuth} disabled={!connected}>Authenticate</Button>
                <Button onClick={handshakeAndConnect}>MCP Handshake & Connect</Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm mb-2">Search Repo</label>
                    <div className="flex gap-2 mb-2">
                        <Input placeholder="search query" value={query} onChange={(e) => setQuery((e.target as HTMLInputElement).value)} />
                        <Button onClick={callSearch}>Search</Button>
                    </div>

                    <label className="block text-sm mb-2">Code Snippet</label>
                    <textarea className="w-full h-64 p-2 border rounded mb-2" value={code} onChange={(e) => setCode((e.target as HTMLTextAreaElement).value)} />
                    <div className="flex gap-2">
                        <Button onClick={callSave}>Save Snippet</Button>
                        <Button onClick={callLLM}>Invoke LLM</Button>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg mb-2">Tool Results</h3>
                    <div className="space-y-2">
                        {results.map((r, idx) => (
                            <div key={idx} className="p-2 border rounded bg-white">
                                <div className="font-medium">{r.tool}</div>
                                <pre className="text-xs max-h-48 overflow-auto">{JSON.stringify(r.result, null, 2)}</pre>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
