"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Database, Users, MessageSquare, Brain } from "lucide-react"

interface Session {
  id: string
  created_at: string
  updated_at: string
  status: string
  model_config: string | null
  title: string | null
  conversation_count: number
}

interface AgentMetric {
  agent_role: string
  total_queries: number
  total_score: number
  best_responses: number
  avg_response_time: number
}

interface Agent {
  id: string
  name: string
  specialization: string
  avatar: string
  color: string
  voiceType: string
}

export default function AdminDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [metrics, setMetrics] = useState<AgentMetric[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionsRes = await fetch("/api/admin/sessions")
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json()
          setSessions(sessionsData.sessions || [])
        }

        const metricsRes = await fetch("/api/admin/metrics")
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json()
          setMetrics(metricsData.metrics || [])
        }

        const agentsRes = await fetch("/api/admin/persona")
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json()
          setAgents(agentsData.registry || [])
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalConversations = sessions.reduce((acc, s) => acc + (s.conversation_count || 0), 0)
  const totalQueries = metrics.reduce((acc, m) => acc + m.total_queries, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Admin overview and system metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{loading ? "-" : sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Conversations</p>
                <p className="text-2xl font-bold">{loading ? "-" : totalConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/10 rounded-lg">
                <Users className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Agents</p>
                <p className="text-2xl font-bold">{loading ? "-" : agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Brain className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Queries</p>
                <p className="text-2xl font-bold">{loading ? "-" : totalQueries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
