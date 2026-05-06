"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  Check,
  RefreshCw,
  Search
} from "lucide-react"

interface Model {
  id: string
  name: string
  description: string
}

interface ProviderData {
  models: Model[]
  baseUrl?: string
  available: boolean
  apiKey?: string
  connection?: {
    connected: boolean
    latency?: number
    error?: string
  }
}

export default function ModelConfig() {
  const router = useRouter()
  const [ollamaData, setOllamaData] = useState<ProviderData | null>(null)
  const [geminiData, setGeminiData] = useState<ProviderData | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<'ollama' | 'gemini'>('ollama')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedConfigLoaded, setSavedConfigLoaded] = useState(false)

  const combinedModels = useMemo(() => {
    const ollamaModels = (ollamaData?.models || []).map(m => ({
      ...m,
      provider: 'ollama' as const,
      providerLabel: 'Ollama',
    }))
    const geminiModels = (geminiData?.models || []).map(m => ({
      ...m,
      provider: 'gemini' as const,
      providerLabel: 'Google',
    }))
    return [...ollamaModels, ...geminiModels]
  }, [ollamaData, geminiData])

  useEffect(() => {
    fetchModels()
    loadSavedConfig()
  }, [])

  const loadSavedConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings?key=default_model_config')
      if (res.ok) {
        const data = await res.json()
        if (data.setting?.value) {
          const config = JSON.parse(data.setting.value)
          setSelectedProvider((config.provider || 'ollama') as 'ollama' | 'gemini')
          setSelectedModel(config.model || '')
        }
      }
    } catch (error) {
      console.error('Error loading saved config:', error)
    } finally {
      setSavedConfigLoaded(true)
    }
  }

  const fetchModels = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/models')
      if (res.ok) {
        const data = await res.json()
        setOllamaData(data.ollama)
        setGeminiData(data.gemini)

        if (!savedConfigLoaded && !selectedModel) {
          const fallback =
            data.ollama?.models?.[0]?.id ||
            data.gemini?.models?.[0]?.id ||
            ''
          if (fallback) {
            setSelectedModel(fallback)
            setSelectedProvider(data.ollama?.models?.[0]?.id ? 'ollama' : 'gemini')
          }
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveModelConfig = async () => {
    try {
      setSaving(true)
      
      const config = {
        provider: selectedProvider,
        model: selectedModel,
        ...(selectedProvider === 'ollama' && { 
          baseUrl: ollamaData?.baseUrl || 'http://localhost:11434' 
        })
      }
      
      // Save to system settings
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'default_model_config',
          value: JSON.stringify(config)
        })
      })
      
      alert('Model configuration saved successfully!')
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const filtered = combinedModels.filter(m => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.providerLabel.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading model configurations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Model Configuration</h1>
              <p className="text-muted-foreground">Select AI provider and default model</p>
            </div>
          </div>
          <Button onClick={fetchModels} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Models
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available Models</CardTitle>
            <CardDescription>Select one model as default (provider is saved automatically)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="flex-1"
              />
              <Badge variant="secondary">Ollama: {ollamaData?.models?.length || 0}</Badge>
              <Badge variant="secondary">Google: {geminiData?.models?.length || 0}</Badge>
            </div>

            <RadioGroup
              value={`${selectedProvider}:${selectedModel}`}
              onValueChange={(v) => {
                const [provider, model] = v.split(':')
                if (!provider || !model) return
                setSelectedProvider(provider as 'ollama' | 'gemini')
                setSelectedModel(model)
              }}
              className="space-y-3"
            >
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No models found</div>
              ) : (
                filtered.map((m) => (
                  <div
                    key={`${m.provider}:${m.id}`}
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedProvider === m.provider && selectedModel === m.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent/40'
                    }`}
                    onClick={() => {
                      setSelectedProvider(m.provider)
                      setSelectedModel(m.id)
                    }}
                  >
                    <RadioGroupItem value={`${m.provider}:${m.id}`} id={`${m.provider}:${m.id}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`${m.provider}:${m.id}`} className="font-medium cursor-pointer">
                          {m.name}
                        </Label>
                        <Badge variant="outline">{m.providerLabel}</Badge>
                        {m.provider === 'gemini' && (
                          geminiData?.connection?.connected ? (
                            <Badge className="bg-green-500" variant="default">Connected</Badge>
                          ) : (
                            <Badge variant="destructive">Disconnected</Badge>
                          )
                        )}
                        {m.provider === 'ollama' && !ollamaData?.available && (
                          <Badge variant="destructive">Offline</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{m.description}</p>
                    </div>
                    {selectedProvider === m.provider && selectedModel === m.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                ))
              )}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Selected Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Provider: <Badge variant="outline">{selectedProvider}</Badge>
                  {' '}Model: <Badge variant="outline">{selectedModel || 'None'}</Badge>
                </p>
              </div>
              <Button 
                onClick={saveModelConfig}
                disabled={saving || !selectedModel}
                size="lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save as Default
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/40">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">How it works</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Each meeting session can have its own model configuration</li>
              <li>Default model is used when creating new sessions</li>
              <li>Ollama models run locally on your computer</li>
              <li>Gemini models require internet and API key</li>
            </ul>
          </CardContent>
        </Card>
    </div>
  )
}
