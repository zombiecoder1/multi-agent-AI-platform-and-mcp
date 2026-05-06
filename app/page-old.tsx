"use client"

import type React from "react"
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

interface AgentCapability {
  name: string
  description: string
  keywords: string[]
}

interface AgentPersonality {
  trait: string
  description: string
}

interface AgentMetadata {
  modelType: string
  complexityLevel: string
  recommendedFrameworks: string[]
  processingTime: number
}

interface AgentResponse {
  agent: string
  response: string
  score: number
  icon: React.ReactNode
  color: string
  timestamp: string
  audioEnabled: boolean
  capability: string
  metadata: AgentMetadata
  source: string
}

interface Agent {
  name: string
  description: string
  style: string
  icon: React.ReactNode
  color: string
  avatar: string
  voiceType: string
  capabilities: Record<string, AgentCapability>
  personality: Record<string, AgentPersonality>
  language: string
  specialization: string
  status: "active" | "inactive" | "error"
  generateResponse: (question: string) => { response: string; capability: string; metadata: AgentMetadata }
}

const saveResponseToLocal = (question: string, responses: AgentResponse[], sessionMetadata: any) => {
  const data = {
    question,
    responses,
    sessionMetadata,
    timestamp: new Date().toISOString(),
    sessionId: Date.now(),
    totalAgents: responses.length,
    bestScore: Math.max(...responses.map((r) => r.score)),
    averageScore: responses.reduce((sum, r) => sum + r.score, 0) / responses.length,
  }

  const existingData = JSON.parse(localStorage.getItem("aiAgentResponses") || "[]")
  existingData.push(data)
  localStorage.setItem("aiAgentResponses", JSON.stringify(existingData))

  const agentMetrics = JSON.parse(localStorage.getItem("agentMetrics") || "{}")
  responses.forEach((response) => {
    if (!agentMetrics[response.agent]) {
      agentMetrics[response.agent] = { totalQueries: 0, totalScore: 0, bestResponses: 0 }
    }
    agentMetrics[response.agent].totalQueries++
    agentMetrics[response.agent].totalScore += response.score
    if (response.score === Math.max(...responses.map((r) => r.score))) {
      agentMetrics[response.agent].bestResponses++
    }
  })
  localStorage.setItem("agentMetrics", JSON.stringify(agentMetrics))
}

const getAllSavedResponses = () => {
  return JSON.parse(localStorage.getItem("aiAgentResponses") || "[]")
}

const getAgentMetrics = () => {
  return JSON.parse(localStorage.getItem("agentMetrics") || "{}")
}

const downloadAllResponses = (format: "json" | "csv" = "json") => {
  const data = getAllSavedResponses()
  const metrics = getAgentMetrics()

  if (format === "json") {
    const exportData = {
      responses: data,
      agentMetrics: metrics,
      exportDate: new Date().toISOString(),
      totalSessions: data.length,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ai-agent-responses-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } else {
    // CSV format for easy analysis
    const csvData = data.map((session: any) => ({
      date: session.timestamp,
      question: session.question,
      bestAgent: session.responses?.[0]?.agent,
      bestScore: session.bestScore,
      averageScore: session.averageScore?.toFixed ? session.averageScore.toFixed(2) : String(session.averageScore ?? ""),
    }))

    const csvContent = [Object.keys(csvData[0]).join(","), ...csvData.map((row: any) => Object.values(row).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ai-agent-analysis-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export default function MultiAgentAI() {
  const [question, setQuestion] = useState("")
  const [responses, setResponses] = useState<AgentResponse[]>([])
  const [bestResponse, setBestResponse] = useState<AgentResponse | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [isMeetingMode, setIsMeetingMode] = useState(false)
  const [agentMetrics, setAgentMetrics] = useState<any>({})
  const [showAgentDetails, setShowAgentDetails] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const agents: Agent[] = [
    {
      name: "Marketing Agent",
      description: "Creative marketing strategies and brand development specialist",
      style: "Creative & Persuasive",
      icon: <Briefcase className="w-5 h-5" />,
      color: "bg-blue-500",
      avatar: "👨‍💼",
      voiceType: "enthusiastic",
      language: "bengali_english_mixed",
      specialization: "Marketing & Brand Strategy",
      status: "active",
      capabilities: {
        brand_strategy: {
          name: "Brand Strategy",
          description: "Brand positioning, messaging, and identity development",
          keywords: ["brand", "branding", "positioning", "identity", "messaging"],
        },
        digital_marketing: {
          name: "Digital Marketing",
          description: "Social media, content marketing, and online campaigns",
          keywords: ["social media", "content", "campaign", "digital", "online"],
        },
        market_research: {
          name: "Market Research",
          description: "Customer analysis, competitor research, and market trends",
          keywords: ["research", "customer", "competitor", "market", "analysis"],
        },
      },
      personality: {
        creative: { trait: "Creative", description: "Innovative and out-of-the-box thinking" },
        persuasive: { trait: "Persuasive", description: "Compelling and convincing communication" },
        data_driven: { trait: "Data-driven", description: "Evidence-based decision making" },
      },
      generateResponse: (q: string) => {
        const capability = q.toLowerCase().includes("brand")
          ? "brand_strategy"
          : q.toLowerCase().includes("social") || q.toLowerCase().includes("content")
            ? "digital_marketing"
            : "market_research"

        const responses = [
          `🎯 এই প্রশ্নের জবাবে আমি বলবো - আপনার target audience কে identify করুন! Market research করে customer pain points বুঝুন। একটা compelling value proposition তৈরি করুন যা competitors থেকে আলাদা। Social proof ব্যবহার করুন এবং emotional connection তৈরি করুন।`,
          `💡 Marketing perspective থেকে দেখলে - Brand storytelling এর মাধ্যমে আপনার message deliver করুন। Multi-channel approach নিন, data-driven decisions নিন। Customer journey map করুন এবং personalized experience দিন। ROI track করতে ভুলবেন না!`,
          `🚀 আমার marketing strategy হবে - First impression matters! Clear messaging, strong CTA, social media engagement বাড়ান। Influencer collaboration করুন, content marketing এ focus করুন। Customer feedback loop তৈরি করুন।`,
        ]

        return {
          response: responses[Math.floor(Math.random() * responses.length)],
          capability,
          metadata: {
            modelType: "Marketing Strategy Model",
            complexityLevel: q.length > 100 ? "Advanced" : "Intermediate",
            recommendedFrameworks: ["Google Analytics", "HubSpot", "Hootsuite", "Canva"],
            processingTime: Math.random() * 2 + 1,
          },
        }
      },
    },
    {
      name: "Tech Agent",
      description: "Software architecture and technical solution specialist",
      style: "Logical & Technical",
      icon: <Code className="w-5 h-5" />,
      color: "bg-green-500",
      avatar: "👨‍💻",
      voiceType: "analytical",
      language: "bengali_english_mixed",
      specialization: "Software Engineering & Architecture",
      status: "active",
      capabilities: {
        system_design: {
          name: "System Design",
          description: "Scalable architecture and system design patterns",
          keywords: ["architecture", "system", "design", "scalable", "microservices"],
        },
        development: {
          name: "Development",
          description: "Code quality, best practices, and development methodologies",
          keywords: ["code", "development", "programming", "best practices", "methodology"],
        },
        devops: {
          name: "DevOps",
          description: "CI/CD, deployment, monitoring, and infrastructure",
          keywords: ["devops", "deployment", "ci/cd", "monitoring", "infrastructure"],
        },
      },
      personality: {
        analytical: { trait: "Analytical", description: "Systematic and logical problem-solving" },
        detail_oriented: { trait: "Detail-oriented", description: "Attention to technical specifications" },
        pragmatic: { trait: "Pragmatic", description: "Practical and efficient solutions" },
      },
      generateResponse: (q: string) => {
        const capability =
          q.toLowerCase().includes("architecture") || q.toLowerCase().includes("system")
            ? "system_design"
            : q.toLowerCase().includes("deploy") || q.toLowerCase().includes("devops")
              ? "devops"
              : "development"

        const responses = [
          `⚡ Technical solution: আপনার architecture scalable হতে হবে। Microservices pattern ব্যবহার করুন, API-first approach নিন। Database optimization করুন, caching implement করুন। Security best practices follow করুন - authentication, authorization, data encryption।`,
          `🔧 System design perspective: Load balancing, horizontal scaling, CI/CD pipeline setup করুন। Monitoring & logging implement করুন। Error handling robust রাখুন। Performance metrics track করুন। Code review process maintain করুন।`,
          `💻 Development approach: Clean code principles follow করুন। Test-driven development করুন। Documentation maintain করুন। Version control properly ব্যবহার করুন। Agile methodology follow করুন।`,
        ]

        return {
          response: responses[Math.floor(Math.random() * responses.length)],
          capability,
          metadata: {
            modelType: "Technical Architecture Model",
            complexityLevel: q.includes("enterprise") || q.includes("scale") ? "Advanced" : "Intermediate",
            recommendedFrameworks: ["Docker", "Kubernetes", "AWS", "React", "Node.js"],
            processingTime: Math.random() * 3 + 1.5,
          },
        }
      },
    },
    {
      name: "HR Agent",
      description: "Human resources and people management specialist",
      style: "People-focused & Empathetic",
      icon: <Users className="w-5 h-5" />,
      color: "bg-purple-500",
      avatar: "👩‍💼",
      voiceType: "empathetic",
      language: "bengali_english_mixed",
      specialization: "Human Resources & People Management",
      status: "active",
      capabilities: {
        talent_management: {
          name: "Talent Management",
          description: "Recruitment, retention, and talent development",
          keywords: ["hiring", "recruitment", "talent", "retention", "development"],
        },
        team_building: {
          name: "Team Building",
          description: "Team dynamics, collaboration, and culture building",
          keywords: ["team", "collaboration", "culture", "dynamics", "building"],
        },
        performance: {
          name: "Performance Management",
          description: "Performance reviews, feedback, and improvement",
          keywords: ["performance", "review", "feedback", "improvement", "evaluation"],
        },
      },
      personality: {
        empathetic: { trait: "Empathetic", description: "Understanding and caring approach" },
        communicative: { trait: "Communicative", description: "Clear and effective communication" },
        supportive: { trait: "Supportive", description: "Encouraging and helpful attitude" },
      },
      generateResponse: (q: string) => {
        const capability =
          q.toLowerCase().includes("hire") || q.toLowerCase().includes("recruit")
            ? "talent_management"
            : q.toLowerCase().includes("team")
              ? "team_building"
              : "performance"

        const responses = [
          `👥 Human resource perspective: Team dynamics খুবই গুরুত্বপূর্ণ। Clear communication establish করুন। Employee engagement বাড়ান। Training & development programs চালু করুন। Work-life balance maintain করুন। Recognition & reward system তৈরি করুন।`,
          `🤝 People management: Hiring process improve করুন। Onboarding experience better করুন। Performance review regular করুন। Career growth path clear করুন। Conflict resolution skills develop করুন।`,
          `💪 Team building: Collaborative environment তৈরি করুন। Diversity & inclusion promote করুন। Mental health support দিন। Feedback culture establish করুন। Leadership development করুন।`,
        ]

        return {
          response: responses[Math.floor(Math.random() * responses.length)],
          capability,
          metadata: {
            modelType: "People Management Model",
            complexityLevel: q.includes("leadership") || q.includes("culture") ? "Advanced" : "Intermediate",
            recommendedFrameworks: ["HRIS", "Slack", "Microsoft Teams", "BambooHR"],
            processingTime: Math.random() * 2 + 1,
          },
        }
      },
    },
    {
      name: "AI Agent",
      description: "Machine learning and artificial intelligence specialist",
      style: "Data-driven & Analytical",
      icon: <Brain className="w-5 h-5" />,
      color: "bg-orange-500",
      avatar: "🤖",
      voiceType: "robotic",
      language: "bengali_english_mixed",
      specialization: "Machine Learning & AI",
      status: "active",
      capabilities: {
        ml_modeling: {
          name: "ML Modeling",
          description: "Machine learning model development and training",
          keywords: ["ml", "machine learning", "model", "training", "algorithm"],
        },
        deep_learning: {
          name: "Deep Learning",
          description: "Neural networks and deep learning architectures",
          keywords: ["deep learning", "neural network", "cnn", "rnn", "transformer"],
        },
        data_analysis: {
          name: "Data Analysis",
          description: "Data preprocessing, analysis, and visualization",
          keywords: ["data", "analysis", "preprocessing", "visualization", "statistics"],
        },
      },
      personality: {
        analytical: { trait: "Analytical", description: "Data-driven and systematic approach" },
        precise: { trait: "Precise", description: "Accurate and detailed analysis" },
        innovative: { trait: "Innovative", description: "Cutting-edge AI solutions" },
      },
      generateResponse: (q: string) => {
        const capability =
          q.toLowerCase().includes("deep") || q.toLowerCase().includes("neural")
            ? "deep_learning"
            : q.toLowerCase().includes("data")
              ? "data_analysis"
              : "ml_modeling"

        const responses = [
          `🤖 AI analysis: Data pattern analysis করে দেখছি - predictive modeling ব্যবহার করুন। Machine learning algorithms implement করুন। Natural language processing করুন। Computer vision যদি applicable হয়। Automation opportunities identify করুন।`,
          `📊 Data science approach: Feature engineering করুন। Model training & validation করুন। A/B testing করুন। Statistical significance check করুন। Bias detection & mitigation করুন। Continuous learning implement করুন।`,
          `🧠 Neural network perspective: Deep learning models ব্যবহার করুন। Transfer learning apply করুন। Ensemble methods try করুন। Hyperparameter tuning করুন। Model interpretability maintain করুন।`,
        ]

        return {
          response: responses[Math.floor(Math.random() * responses.length)],
          capability,
          metadata: {
            modelType: "AI/ML Model",
            complexityLevel: q.includes("deep") || q.includes("neural") ? "Advanced" : "Intermediate",
            recommendedFrameworks: ["TensorFlow", "PyTorch", "scikit-learn", "Pandas", "NumPy"],
            processingTime: Math.random() * 4 + 2,
          },
        }
      },
    },
    {
      name: "Sarcasm Agent",
      description: "Brutally honest reality check and critical analysis specialist",
      style: "Witty & Brutally Honest",
      icon: <Zap className="w-5 h-5" />,
      color: "bg-red-500",
      avatar: "😏",
      voiceType: "sarcastic",
      language: "bengali_english_mixed",
      specialization: "Critical Analysis & Reality Check",
      status: "active",
      capabilities: {
        reality_check: {
          name: "Reality Check",
          description: "Honest assessment of feasibility and practicality",
          keywords: ["realistic", "practical", "feasible", "honest", "critical"],
        },
        problem_solving: {
          name: "Problem Solving",
          description: "Direct and efficient problem-solving approach",
          keywords: ["problem", "solution", "fix", "resolve", "troubleshoot"],
        },
        optimization: {
          name: "Optimization",
          description: "Efficiency improvements and waste elimination",
          keywords: ["optimize", "improve", "efficient", "better", "streamline"],
        },
      },
      personality: {
        honest: { trait: "Brutally Honest", description: "Direct and unfiltered feedback" },
        witty: { trait: "Witty", description: "Clever and humorous observations" },
        pragmatic: { trait: "Pragmatic", description: "Practical and no-nonsense approach" },
      },
      generateResponse: (q: string) => {
        const capability =
          q.toLowerCase().includes("optimize") || q.toLowerCase().includes("improve")
            ? "optimization"
            : q.toLowerCase().includes("problem") || q.toLowerCase().includes("issue")
              ? "problem_solving"
              : "reality_check"

        const responses = [
          `😏 আরে ভাই, এত সহজ প্রশ্ন করলেন কেন? Google করলেই তো পেয়ে যেতেন! যাইহোক, আমার "expert" opinion হলো - common sense ব্যবহার করুন। Over-engineering করবেন না। Simple solution যদি কাজ করে, complex করার দরকার নেই। আর হ্যাঁ, documentation পড়ার অভ্যাস করুন! 📚`,
          `🙄 ওহ, আরেকটা "revolutionary" idea! শুনুন, wheel আবার invent করার দরকার নেই। Existing solutions check করুন। Stack Overflow আপনার বন্ধু। Copy-paste করার আগে code বুঝে নিন। আর testing? সেটা optional না, mandatory! 🤦‍♂️`,
          `😂 বাহ বাহ! এই প্রশ্নের জন্য PhD লাগবে নাকি? Look, reality check - budget আছে? Timeline realistic? Team capable? না থাকলে dream project বাদ দিয়ে practical solution নিন। MVP দিয়ে শুরু করুন, পরে scale করবেন। 🎯`,
        ]

        return {
          response: responses[Math.floor(Math.random() * responses.length)],
          capability,
          metadata: {
            modelType: "Critical Analysis Model",
            complexityLevel: "Reality-based",
            recommendedFrameworks: ["Common Sense", "Google", "Stack Overflow", "Documentation"],
            processingTime: Math.random() * 1 + 0.5,
          },
        }
      },
    },
  ]

  useEffect(() => {
    setSavedCount(getAllSavedResponses().length)
    setAgentMetrics(getAgentMetrics())
  }, [])

  const calculateScore = (response: string, capability: string, metadata: AgentMetadata): number => {
    let score = 0

    // Length scoring
    const length = response.length
    if (length >= 100 && length <= 300) score += 30
    else if (length >= 50) score += 20
    else score += 10

    // Keyword relevance
    const keywords = ["করুন", "implement", "solution", "approach", "strategy", "development", "analysis"]
    const keywordCount = keywords.filter((keyword) => response.toLowerCase().includes(keyword.toLowerCase())).length
    score += keywordCount * 10

    // Visual elements
    if (response.includes("🎯") || response.includes("💡") || response.includes("⚡")) score += 15
    if (response.includes("-") || response.includes("।")) score += 10

    // Practical words
    const practicalWords = ["করুন", "নিন", "ব্যবহার", "তৈরি", "maintain", "follow"]
    const practicalCount = practicalWords.filter((word) => response.toLowerCase().includes(word.toLowerCase())).length
    score += practicalCount * 5

    const capabilityBonus = {
      ml_modeling: 10,
      deep_learning: 15,
      system_design: 12,
      brand_strategy: 8,
      reality_check: 5,
    }
    score += capabilityBonus[capability as keyof typeof capabilityBonus] || 0

    if (metadata.complexityLevel === "Advanced") score += 10
    else if (metadata.complexityLevel === "Intermediate") score += 5

    return Math.min(score, 100)
  }

  const handleSubmit = async () => {
    if (!question.trim()) return

    setIsProcessing(true)
    setResponses([])
    setBestResponse(null)

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const agentResponses: AgentResponse[] = agents.map((agent) => {
      const result = agent.generateResponse(question)
      const score = calculateScore(result.response, result.capability, result.metadata)

      return {
        agent: agent.name,
        response: result.response,
        score,
        icon: agent.icon,
        color: agent.color,
        timestamp: new Date().toLocaleTimeString(),
        audioEnabled: audioEnabled,
        capability: result.capability,
        metadata: result.metadata,
        source: `${agent.specialization.toLowerCase().replace(/\s+/g, "_")}_agent`,
      }
    })

    const sortedResponses = agentResponses.sort((a, b) => b.score - a.score)

    setResponses(sortedResponses)
    setBestResponse(sortedResponses[0])

    const sessionMetadata = {
      questionLength: question.length,
      questionComplexity: question.length > 100 ? "complex" : question.length > 50 ? "medium" : "simple",
      totalProcessingTime: sortedResponses.reduce((sum, r) => sum + r.metadata.processingTime, 0),
      capabilitiesUsed: [...new Set(sortedResponses.map((r) => r.capability))],
      averageScore: sortedResponses.reduce((sum, r) => sum + r.score, 0) / sortedResponses.length,
    }

    saveResponseToLocal(question, sortedResponses, sessionMetadata)
    setSavedCount((prev) => prev + 1)
    setAgentMetrics(getAgentMetrics())

    if (audioEnabled && sortedResponses[0]) {
      const bestAgent = agents.find((a) => a.name === sortedResponses[0].agent)
      if (bestAgent) {
        setTimeout(() => speakResponse(sortedResponses[0].response, bestAgent.voiceType), 500)
      }
    }

    setIsProcessing(false)
  }

  return (
    <div
      className={`min-h-screen ${isMeetingMode ? "bg-gradient-to-br from-slate-800 to-slate-900" : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"} p-4`}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
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
              onClick={() => setShowAdmin(!showAdmin)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Admin ({savedCount})
            </Button>
          </div>

          <h1
            className={`text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${isMeetingMode ? "text-white" : ""}`}
          >
            {isMeetingMode ? "🏢 AI Board Meeting" : "Multi-Agent AI System"}
          </h1>
          <p className={`text-lg ${isMeetingMode ? "text-slate-300" : "text-muted-foreground"}`}>
            {isMeetingMode
              ? "Professional AI consultation with 5 expert advisors"
              : "৫টি AI Agent এর সাথে আপনার প্রশ্নের উত্তর পান - সবচেয়ে ভালো উত্তর auto-select হবে!"}
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
                Total saved sessions: {savedCount} | API Integration Ready: HuggingFace, Claude, Vercel, OpenAI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => downloadAllResponses("json")} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download JSON
                </Button>
                <Button
                  onClick={() => downloadAllResponses("csv")}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  Download CSV
                </Button>
                <Button variant="outline" onClick={() => localStorage.clear()}>
                  Clear Storage
                </Button>
                <Badge variant="secondary">🤗 HuggingFace Ready</Badge>
                <Badge variant="secondary">🧠 Claude Ready</Badge>
                <Badge variant="secondary">▲ Vercel Ready</Badge>
                <Badge variant="secondary">🤖 OpenAI Ready</Badge>
              </div>

              {Object.keys(agentMetrics).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Agent Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(agentMetrics).map(([agentName, metrics]: [string, any]) => (
                      <div key={agentName} className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                        <div className="text-sm font-medium">{agentName}</div>
                        <div className="text-xs text-muted-foreground">
                          Queries: {metrics.totalQueries} | Avg Score:{" "}
                          {(metrics.totalScore / metrics.totalQueries).toFixed(1)} | Best: {metrics.bestResponses}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showAgentDetails && (
          <Card className="shadow-lg border-2 border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Agent Capabilities & Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <Card
                    key={agent.name}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedAgent(selectedAgent?.name === agent.name ? null : agent)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{agent.avatar}</span>
                      <div className={`p-1 rounded-full ${agent.color} text-white`}>{agent.icon}</div>
                      <div>
                        <div className="font-medium text-sm">{agent.name}</div>
                        <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-xs">
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{agent.specialization}</div>
                    <div className="text-xs">
                      Capabilities: {Object.keys(agent.capabilities).length} | Language: {agent.language}
                    </div>

                    {selectedAgent?.name === agent.name && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div>
                          <div className="text-xs font-medium mb-1">Capabilities:</div>
                          {Object.entries(agent.capabilities).map(([key, cap]) => (
                            <Badge key={key} variant="outline" className="text-xs mr-1 mb-1">
                              {cap.name}
                            </Badge>
                          ))}
                        </div>
                        <div>
                          <div className="text-xs font-medium mb-1">Personality:</div>
                          {Object.entries(agent.personality).map(([key, pers]) => (
                            <Badge key={key} variant="secondary" className="text-xs mr-1 mb-1">
                              {pers.trait}
                            </Badge>
                          ))}
                        </div>
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
                : "যেকোনো বিষয়ে প্রশ্ন করুন - আমাদের ৫টি বিশেষজ্ঞ Agent উত্তর দিবে"}
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
              />
              <Button onClick={handleSubmit} disabled={!question.trim() || isProcessing} className="px-8">
                {isProcessing ? "Processing..." : isMeetingMode ? "Present" : "Ask Agents"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, index) => (
            <Card
              key={agent.name}
              className={`hover:shadow-md transition-shadow ${isMeetingMode ? "bg-slate-800 border-slate-700" : ""}`}
            >
              <CardHeader className="pb-3">
                <CardTitle className={`flex items-center gap-2 text-sm ${isMeetingMode ? "text-white" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{agent.avatar}</span>
                    <div className={`p-2 rounded-full ${agent.color} text-white`}>{agent.icon}</div>
                  </div>
                  {agent.name}
                </CardTitle>
                <CardDescription className={`text-xs ${isMeetingMode ? "text-slate-300" : ""}`}>
                  {agent.style} • Voice: {agent.voiceType}
                  <br />
                  <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-xs mt-1">
                    {agent.status}
                  </Badge>
                  <span className="ml-2 text-xs">{agent.specialization}</span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* ... existing code for processing, best response, and all responses ... */}

        {isProcessing && (
          <Card className="shadow-lg">
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-lg font-medium">
                  {isMeetingMode ? "Board members are deliberating..." : "Agents are thinking..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isMeetingMode ? "Expert analysis in progress" : "সব Agent রা আপনার প্রশ্নের উত্তর তৈরি করছে"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {bestResponse && (
          <Card className="shadow-xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <Trophy className="w-6 h-6" />🏆 {isMeetingMode ? "Chairman's Recommendation" : "Best Response"} (Score:{" "}
                {bestResponse.score}/100)
              </CardTitle>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{agents.find((a) => a.name === bestResponse.agent)?.avatar}</span>
                  <div className={`p-1 rounded-full ${bestResponse.color} text-white`}>{bestResponse.icon}</div>
                  <Badge variant="secondary">{bestResponse.agent}</Badge>
                  <Badge variant="outline">{bestResponse.timestamp}</Badge>
                  <Badge variant="outline">{bestResponse.capability}</Badge>
                  <Badge variant="outline">{bestResponse.metadata.complexityLevel}</Badge>
                </div>
                {audioEnabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const agent = agents.find((a) => a.name === bestResponse.agent)
                      if (agent) speakResponse(bestResponse.response, agent.voiceType)
                    }}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">{bestResponse.response}</p>
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>Model: {bestResponse.metadata.modelType}</div>
                    <div>Processing: {bestResponse.metadata.processingTime.toFixed(1)}s</div>
                    <div>Source: {bestResponse.source}</div>
                    <div>Frameworks: {bestResponse.metadata.recommendedFrameworks.slice(0, 2).join(", ")}</div>
                  </div>
                </div>
              </div>
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
              {responses.map((response, index) => (
                <Card
                  key={response.agent}
                  className={`transition-all ${response === bestResponse ? "ring-2 ring-yellow-400 shadow-lg" : "hover:shadow-md"
                    } ${isMeetingMode ? "bg-slate-800 border-slate-700" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{agents.find((a) => a.name === response.agent)?.avatar}</span>
                        <div className={`p-1 rounded-full ${response.color} text-white`}>{response.icon}</div>
                        <CardTitle className={`text-lg ${isMeetingMode ? "text-white" : ""}`}>
                          {response.agent}
                        </CardTitle>
                        <Badge variant="outline">{response.timestamp}</Badge>
                        <Badge variant="outline">{response.capability}</Badge>
                        <Badge variant="outline">{response.metadata.complexityLevel}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={response === bestResponse ? "default" : "secondary"}>
                          Score: {response.score}/100
                        </Badge>
                        {audioEnabled && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const agent = agents.find((a) => a.name === response.agent)
                              if (agent) speakResponse(response.response, agent.voiceType)
                            }}
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={`leading-relaxed ${isMeetingMode ? "text-slate-200" : ""}`}>{response.response}</p>
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>Model: {response.metadata.modelType}</div>
                        <div>Time: {response.metadata.processingTime.toFixed(1)}s</div>
                        <div>Source: {response.source}</div>
                        <div>Frameworks: {response.metadata.recommendedFrameworks.slice(0, 2).join(", ")}</div>
                      </div>
                    </div>
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
