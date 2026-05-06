"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit3 } from "lucide-react"

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

export default function AgentsPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<AgentMetric[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
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
        console.error("Error fetching agents:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading agents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agents</h1>
        <p className="text-muted-foreground mt-2">Manage AI agents and their personas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Status</CardTitle>
          <CardDescription>View and manage all configured agents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => {
              const metric = metrics.find(m => m.agent_role === agent.id)
              return (
                <Card key={agent.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{agent.avatar}</span>
                      <div className="flex-1">
                        <h4 className="font-medium">{agent.name}</h4>
                        <p className="text-sm text-muted-foreground">{agent.specialization}</p>
                        {metric && (
                          <div className="flex gap-2 mt-2 text-xs">
                            <Badge variant="outline">{metric.total_queries} queries</Badge>
                            <Badge variant="outline">{metric.best_responses} best</Badge>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/persona/${agent.id}`)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
