"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, ExternalLink, RefreshCw, Plus, Trash2 } from "lucide-react"

interface Session {
  id: string
  created_at: string
  updated_at: string
  status: string
  model_config: string | null
  title: string | null
  conversation_count: number
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())

  const fetchSessions = async () => {
    try {
      setRefreshing(true)
      const res = await fetch("/api/admin/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error("Error fetching sessions:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const bulkArchiveSessions = async () => {
    const ids = Array.from(selectedSessionIds)
    if (ids.length === 0) return
    if (!confirm(`Archive ${ids.length} selected sessions?`)) return

    try {
      await fetch("/api/admin/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })

      setSessions(prev => prev.filter(s => !selectedSessionIds.has(s.id)))
      setSelectedSessionIds(new Set())
    } catch (error) {
      console.error("Error bulk archiving sessions:", error)
    }
  }

  const bulkDeleteSessions = async () => {
    const ids = Array.from(selectedSessionIds)
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} selected sessions?`)) return

    try {
      await fetch("/api/admin/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, permanent: true }),
      })

      setSessions(prev => prev.filter(s => !selectedSessionIds.has(s.id)))
      setSelectedSessionIds(new Set())
    } catch (error) {
      console.error("Error bulk deleting sessions:", error)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const toggleSessionSelected = (sessionId: string, selected: boolean) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      if (selected) next.add(sessionId)
      else next.delete(sessionId)
      return next
    })
  }

  const setAllSessionsSelected = (selected: boolean) => {
    if (!selected) {
      setSelectedSessionIds(new Set())
      return
    }
    setSelectedSessionIds(new Set(sessions.map(s => s.id)))
  }

  const createNewSession = async () => {
    const id = `session-${Date.now()}`
    try {
      await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: `Meeting ${sessions.length + 1}` }),
      })
      router.push(`/admin/meeting/${id}`)
    } catch (error) {
      console.error("Error creating session:", error)
    }
  }

  const viewSession = (sessionId: string) => {
    router.push(`/admin/meeting/${sessionId}`)
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return

    try {
      await fetch(`/api/admin/sessions?id=${sessionId}&permanent=true`, { method: "DELETE" })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      setSelectedSessionIds(prev => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
    } catch (error) {
      console.error("Error deleting session:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground mt-2">View and manage meeting sessions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSessions} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={createNewSession}>
            <Plus className="w-4 h-4 mr-2" />
            New Meeting
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Sessions</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={bulkArchiveSessions}
                disabled={selectedSessionIds.size === 0}
              >
                Archive Selected ({selectedSessionIds.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={bulkDeleteSessions}
                disabled={selectedSessionIds.size === 0}
              >
                Delete Selected ({selectedSessionIds.size})
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Bulk-select and archive sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sessions found. Create a new meeting to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  checked={sessions.length > 0 && selectedSessionIds.size === sessions.length}
                  onChange={(e) => setAllSessionsSelected(e.target.checked)}
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>

              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedSessionIds.has(session.id)}
                      onChange={(e) => toggleSessionSelected(session.id, e.target.checked)}
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {session.title || `Session ${session.id.slice(0, 8)}`}
                        </h4>
                        <Badge variant={session.status === "active" ? "default" : "secondary"}>
                          {session.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.conversation_count || 0} conversations • Created: {new Date(session.created_at).toLocaleString()}
                      </p>
                      {session.model_config && (
                        <p className="text-xs text-muted-foreground mt-1">Model: {session.model_config}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => viewSession(session.id)}>
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteSession(session.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
