"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Calendar, 
  MessageSquare, 
  Brain,
  Bot,
  User,
  Download,
  Clock,
  Copy
} from "lucide-react"

interface Conversation {
  id: string
  session_id: string
  user_message: string
  agent_response: string
  agent_role: string
  model_used: string
  score: number
  timestamp: string
}

interface Session {
  id: string
  created_at: string
  updated_at: string
  status: string
  model_config: string | null
  title: string | null
  conversation_count: number
}

interface Agent {
  id: string
  name: string
  avatar: string
}

export default function MeetingDetail() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [agents, setAgents] = useState<Record<string, Agent>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [sessionId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch session details
      const sessionRes = await fetch(`/api/admin/sessions?id=${sessionId}`)
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        setSession(sessionData.session)
      }
      
      // Fetch conversations
      const convRes = await fetch(`/api/admin/conversations?sessionId=${sessionId}`)
      if (convRes.ok) {
        const convData = await convRes.json()
        setConversations(convData.conversations || [])
      }
      
      // Fetch agents for names
      const agentsRes = await fetch('/api/admin/persona')
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        const agentMap: Record<string, Agent> = {}
        agentsData.registry?.forEach((a: Agent) => {
          agentMap[a.id] = a
        })
        setAgents(agentMap)
      }
    } catch (error) {
      console.error('Error fetching meeting data:', error)
    } finally {
      setLoading(false)
    }
  }

  const copySessionUrl = () => {
    const url = `${window.location.origin}/admin/meeting/${sessionId}`
    navigator.clipboard.writeText(url)
    alert('Meeting URL copied to clipboard!')
  }

  const exportData = () => {
    const data = {
      session,
      conversations,
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-${sessionId.slice(0, 8)}.json`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading meeting details...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-xl font-semibold text-slate-900">Session not found</h2>
              <p className="text-slate-500 mt-2">The requested meeting session does not exist.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copySessionUrl}>
              <Copy className="w-4 h-4 mr-2" />
              Copy URL
            </Button>
            <Button variant="outline" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Session Info */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {session.title || `Meeting ${session.id.slice(0, 8)}`}
                </CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(session.created_at).toLocaleString()}
                  </span>
                  <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                    {session.status}
                  </Badge>
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Session ID</p>
                <p className="font-mono text-sm">{session.id}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-100 rounded-lg">
                <MessageSquare className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-2xl font-bold">{conversations.length}</p>
                <p className="text-sm text-slate-600">Conversations</p>
              </div>
              <div className="text-center p-4 bg-slate-100 rounded-lg">
                <Bot className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-bold">
                  {new Set(conversations.map(c => c.agent_role)).size}
                </p>
                <p className="text-sm text-slate-600">Agents Used</p>
              </div>
              <div className="text-center p-4 bg-slate-100 rounded-lg">
                <Brain className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <p className="text-2xl font-bold">
                  {session.model_config ? 'Custom' : 'Default'}
                </p>
                <p className="text-sm text-slate-600">Model Config</p>
              </div>
            </div>
            {session.model_config && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  <strong>Model:</strong> {session.model_config}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation History</CardTitle>
            <CardDescription>All Q&A from this meeting session</CardDescription>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No conversations yet. Start asking questions!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {conversations.map((conv, index) => (
                  <div key={conv.id} className="space-y-4">
                    {index > 0 && <Separator />}
                    
                    {/* User Message */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-500 mb-1">
                          User • {new Date(conv.timestamp).toLocaleTimeString()}
                        </p>
                        <p className="text-slate-900">{conv.user_message}</p>
                      </div>
                    </div>
                    
                    {/* Agent Response */}
                    <div className="flex gap-3 ml-4">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">
                          {agents[conv.agent_role]?.avatar || '🤖'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-slate-500">
                            {agents[conv.agent_role]?.name || conv.agent_role}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Score: {conv.score}/100
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {conv.model_used}
                          </Badge>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-slate-900 whitespace-pre-wrap">{conv.agent_response}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push(`/?session=${sessionId}`)}
            >
              <Brain className="w-4 h-4 mr-2" />
              Continue this Meeting
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
