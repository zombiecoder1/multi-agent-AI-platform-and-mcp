"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Save, 
  RotateCcw,
  Edit3,
  Trash2
} from "lucide-react"

interface AgentData {
  agentId: string
  override: {
    agent_id: string
    role: string
    updated_at: string
  } | null
  registryRole: string
  effectiveRole: string
}

export default function PersonaEdit() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.agentId as string
  
  const [agentData, setAgentData] = useState<AgentData | null>(null)
  const [role, setRole] = useState('')
  const [originalRole, setOriginalRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [agentId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/persona?agentId=${agentId}`)
      if (res.ok) {
        const data = await res.json()
        setAgentData(data)
        const currentRole = data.override?.role || data.registryRole || ''
        setRole(currentRole)
        setOriginalRole(currentRole)
      }
    } catch (error) {
      console.error('Error fetching persona:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePersona = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, role })
      })
      
      if (res.ok) {
        alert('Persona saved successfully!')
        setOriginalRole(role)
      } else {
        alert('Failed to save persona')
      }
    } catch (error) {
      console.error('Error saving persona:', error)
      alert('Error saving persona')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async () => {
    if (!confirm('Reset to default persona? This will delete your custom override.')) return
    
    try {
      const res = await fetch(`/api/admin/persona?agentId=${agentId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        alert('Reset to default!')
        fetchData()
      }
    } catch (error) {
      console.error('Error resetting persona:', error)
    }
  }

  const hasChanges = role !== originalRole

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading persona...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Edit Persona</h1>
              <p className="text-slate-600">Agent ID: {agentId}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {agentData?.override && (
              <Button variant="outline" onClick={resetToDefault}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            )}
            <Button 
              onClick={savePersona} 
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="flex gap-2">
          {agentData?.override ? (
            <Badge variant="default">Custom Override Active</Badge>
          ) : (
            <Badge variant="secondary">Using Default</Badge>
          )}
          {hasChanges && (
            <Badge variant="destructive">Unsaved Changes</Badge>
          )}
        </div>

        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              System Prompt (Persona)
            </CardTitle>
            <CardDescription>
              Edit how this AI agent behaves and responds. This is the system prompt sent to the AI model.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Enter system prompt..."
            />
            <p className="text-sm text-slate-500 mt-2">
              {role.length} characters
            </p>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-900 text-lg">Tips for Effective Personas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-yellow-800 space-y-2 list-disc list-inside">
              <li>Be specific about the agent's expertise and role</li>
              <li>Include communication style (formal, casual, technical)</li>
              <li>Mention language preferences (Bengali-English mix)</li>
              <li>Define key capabilities and limitations</li>
              <li>Add examples of how they should respond</li>
              <li>Use &quot;CRITICAL:&quot; for must-follow instructions</li>
            </ul>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="bg-slate-100">
          <CardHeader>
            <CardTitle className="text-lg">Current Effective Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-4 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
              {agentData?.effectiveRole || 'No role defined'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
