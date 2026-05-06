"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Brain,
  Briefcase,
  Users,
  Code,
  Zap,
  Trophy,
  Volume2,
  VolumeX,
  Download,
  Settings,
  Mic,
  Activity,
  Database,
} from "lucide-react"
import { speakResponse } from "@/utils/audioUtils"
import { WebSocketClient } from "@/utils/websocket"

interface AgentInfo {
  id: string
  name: string
  specialization: string
  avatar: string
  color: string
  voiceType: string
}

interface AgentResponse {
  agent: string
  agentId: string
  response: string
  score: number
  avatar: string
  color: string
  timestamp: string
  audioEnabled: boolean
  capability: string
  conversationId: string
}

export default function MultiAgentAI() {
  const [question, setQuestion] = useState("")
  const [responses, setResponses] = useState<AgentResponse[]>([])
  const [bestResponse, setBestResponse] = useState<AgentResponse | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isMeetingMode, setIsMeetingMode] = useState(false)
  const [showAgentDetails, setShowAgentDetails] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [askMode, setAskMode] = useState<'all' | 'selected'>('all')
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set())
  
  const wsClientRef = useRef<WebSocketClient | null>(null)
  const streamingResponsesRef = useRef<Map<string, string>>(new Map())
  const agentsRef = useRef<AgentInfo[]>([])
  const sessionIdRef = useRef<string>("")

  useEffect(() => {
    agentsRef.current = agents
  }, [agents])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('session')
    if (sid && !sessionIdRef.current) {
      setSessionId(sid)
    }
  }, [])

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"
    const wsClient = new WebSocketClient(wsUrl)
    wsClientRef.current = wsClient

    wsClient.connect({
      onOpen: () => {
        wsClient.getAgents()
      },
      onChunk: (chunk: string, agentId: string) => {
        const key = agentId
        const currentResponse = streamingResponsesRef.current.get(key) || ""
        const newResponse = currentResponse + chunk
        streamingResponsesRef.current.set(key, newResponse)

        setResponses(prev => {
          const existing = prev.find(r => r.agentId === agentId)
          if (existing) {
            return prev.map(r => r.agentId === agentId ? { ...r, response: newResponse } : r)
          }
          return [...prev]
        })
      },
      onComplete: (response: string, agentId: string, conversationId: string) => {
        const agent = agentsRef.current.find(a => a.id === agentId)
        if (agent) {
          setResponses(prev => {
            const updated = prev.map(r => 
              r.agentId === agentId 
                ? { ...r, response, conversationId, score: calculateScore(response) }
                : r
            )
            
            const completed = updated.filter(r => r.response.length > 0)
            if (completed.length === updated.length && completed.length > 0) {
              const sorted = updated.sort((a, b) => b.score - a.score)
              setBestResponse(sorted[0])
              setIsProcessing(false)
              
              if (audioEnabled && sorted[0]) {
                setTimeout(() => speakResponse(sorted[0].response, sorted[0].agent), 500)
              }
            }
            
            return updated
          })
        }
      },
      onError: (error: string) => {
        console.error("WebSocket error:", error)
        setIsProcessing(false)
      },
      onConversationId: (conversationId: string, newSessionId: string) => {
        if (!sessionIdRef.current) {
          setSessionId(newSessionId)
        }
      },
      onAgents: (agentsList: any[]) => {
        setAgents(agentsList)
      }
    }).then(() => {
      setIsConnected(true)
    }).catch(console.error)

    return () => {
      wsClient.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const calculateScore = (response: string): number => {
    let score = 0
    const length = response.length
    if (length >= 100 && length <= 300) score += 30
    else if (length >= 50) score += 20
    else score += 10

    const keywords = ["করুন", "implement", "solution", "approach", "strategy", "development", "analysis"]
    const keywordCount = keywords.filter(keyword => response.toLowerCase().includes(keyword.toLowerCase())).length
    score += keywordCount * 10

    if (response.includes("🎯") || response.includes("💡") || response.includes("⚡")) score += 15
    if (response.includes("-") || response.includes("।")) score += 10

    const practicalWords = ["করুন", "নিন", "ব্যবহার", "তৈরি", "maintain", "follow"]
    const practicalCount = practicalWords.filter(word => response.toLowerCase().includes(word.toLowerCase())).length
    score += practicalCount * 5

    return Math.min(score, 100)
  }

  const handleSubmit = async () => {
    if (!question.trim() || !wsClientRef.current || !isConnected) return

    setIsProcessing(true)
    setResponses([])
    setBestResponse(null)
    streamingResponsesRef.current.clear()

    const targetAgents = askMode === 'all'
      ? agents
      : agents.filter(a => selectedAgentIds.has(a.id))

    if (targetAgents.length === 0) {
      setIsProcessing(false)
      return
    }

    targetAgents.forEach(agent => {
      setResponses(prev => [...prev, {
        agent: agent.name,
        agentId: agent.id,
        response: "",
        score: 0,
        avatar: agent.avatar,
        color: agent.color,
        timestamp: new Date().toLocaleTimeString(),
        audioEnabled: audioEnabled,
        capability: agent.specialization,
        conversationId: ""
      }])

      wsClientRef.current?.sendQuestion(question, agent.id, sessionId)
    })
  }

  return (
    <div className={`min-h-screen ${isMeetingMode ? "bg-gradient-to-br from-slate-800 to-slate-900" : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"} p-4`}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
              </Badge>
              <Button
                variant={isMeetingMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsMeetingMode(!isMeetingMode)}
                className="flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                {isMeetingMode ? "Exit Meeting" : "Meeting Mode"}
              </Button>
              <Button
                variant={audioEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="flex items-center gap-2"
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Audio
              </Button>
              <Button
                variant={showAgentDetails ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAgentDetails(!showAgentDetails)}
                className="flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Agent Details
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin'}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Admin
            </Button>
          </div>

          <h1 className={`text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${isMeetingMode ? "text-white" : ""}`}>
            {isMeetingMode ? "🏢 AI Board Meeting" : "Multi-Agent AI System"}
          </h1>
          <p className={`text-lg ${isMeetingMode ? "text-slate-300" : "text-muted-foreground"}`}>
            {isMeetingMode
              ? "Professional AI consultation with 5 expert advisors"
              : "৫টি AI Agent এর সাথে আপনার প্রশ্নের উত্তর পান - Real-time streaming!"}
          </p>
        </div>

        {showAdmin && (
          <Card className="shadow-lg border-2 border-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Admin Dashboard
              </CardTitle>
              <CardDescription>
                Session: {sessionId || "Not started"} | Database: SQLite | Real-time Streaming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">🗄️ SQLite Active</Badge>
                <Badge variant="secondary">🔄 WebSocket Real-time</Badge>
                <Badge variant="secondary">🤖 LangChain.js</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {showAgentDetails && agents.length > 0 && (
          <Card className="shadow-lg border-2 border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Agent Capabilities & Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Button
                  variant={askMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAskMode('all')}
                >
                  Ask All
                </Button>
                <Button
                  variant={askMode === 'selected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAskMode('selected')}
                >
                  Ask Selected
                </Button>
                {askMode === 'selected' && (
                  <Badge variant="secondary">
                    Selected: {selectedAgentIds.size}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <Card
                    key={agent.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{agent.avatar}</span>
                      <div>
                        <div className="font-medium text-sm">{agent.name}</div>
                        <Badge variant="default" className="text-xs">active</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{agent.specialization}</div>

                    {askMode === 'selected' && (
                      <div className="mt-3">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAgentIds.has(agent.id)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setSelectedAgentIds(prev => {
                                const next = new Set(prev)
                                if (checked) next.add(agent.id)
                                else next.delete(agent.id)
                                return next
                              })
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          Include
                        </label>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-500" />
              {isMeetingMode ? "Present Your Question to the Board" : "আপনার প্রশ্ন করুন"}
            </CardTitle>
            <CardDescription>
              {isMeetingMode
                ? "Our expert panel will provide comprehensive analysis"
                : "যেকোনো বিষয়ে প্রশ্ন করুন - Real AI models থেকে streaming response"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={
                  isMeetingMode
                    ? "How can we scale our business internationally?"
                    : "উদাহরণ: কিভাবে একটি successful startup তৈরি করবো?"
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                className="text-lg"
                disabled={!isConnected}
              />
              <Button onClick={handleSubmit} disabled={!question.trim() || isProcessing || !isConnected} className="px-8">
                {isProcessing ? "Processing..." : isMeetingMode ? "Present" : "Ask Agents"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isProcessing && (
          <Card className="shadow-lg">
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-lg font-medium">
                  {isMeetingMode ? "Board members are deliberating..." : "AI Agents are thinking..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Streaming responses from real AI models
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {bestResponse && (
          <Card className="shadow-xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <Trophy className="w-6 h-6" />🏆 {isMeetingMode ? "Chairman's Recommendation" : "Best Response"} (Score: {bestResponse.score}/100)
              </CardTitle>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{bestResponse.avatar}</span>
                  <Badge variant="secondary">{bestResponse.agent}</Badge>
                  <Badge variant="outline">{bestResponse.timestamp}</Badge>
                </div>
                {audioEnabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => speakResponse(bestResponse.response, bestResponse.agent)}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed whitespace-pre-wrap">{bestResponse.response}</p>
            </CardContent>
          </Card>
        )}

        {responses.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <h2 className={`text-2xl font-bold text-center ${isMeetingMode ? "text-white" : ""}`}>
              {isMeetingMode ? "Board Meeting Minutes" : "All Agent Responses"}
            </h2>
            <div className="grid gap-4">
              {responses.map((response) => (
                <Card
                  key={response.agentId}
                  className={`transition-all ${
                    response === bestResponse ? "ring-2 ring-yellow-400 shadow-lg" : "hover:shadow-md"
                  } ${isMeetingMode ? "bg-slate-800 border-slate-700" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{response.avatar}</span>
                        <CardTitle className={`text-lg ${isMeetingMode ? "text-white" : ""}`}>
                          {response.agent}
                        </CardTitle>
                        <Badge variant="outline">{response.timestamp}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={response === bestResponse ? "default" : "secondary"}>
                          Score: {response.score}/100
                        </Badge>
                        {audioEnabled && response.response && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => speakResponse(response.response, response.agent)}
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={`leading-relaxed whitespace-pre-wrap ${isMeetingMode ? "text-slate-200" : ""}`}>
                      {response.response || "Waiting for response..."}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
