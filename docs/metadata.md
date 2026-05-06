# 🤖 AI Board Meeting - System Metadata & Agent Identity

## 📋 Project Identity

**Project Name:** AI Board Meeting Platform  
**Version:** 1.0.0  
**Created:** April 18, 2026  
**Repository:** https://github.com/zombiecoderbd/AI-Board-Meeting  
**Team:** ZombieCoder BD  

---

## 🎯 Core System Identity

### Purpose
A multi-agent AI discussion platform that enables collaborative decision-making through intelligent agent discussions, specifically optimized for Bangladesh market context with Bengali-English mixed language support.

### Key Features
1. **Multi-Agent Architecture**: 5 specialized AI agents with distinct personas
2. **Real-time Streaming**: WebSocket-based live response delivery
3. **Quality Scoring**: Server-side automated evaluation (0-100)
4. **Bangladesh Context**: Localized for Bengali language and market conditions
5. **Hybrid AI Models**: Support for Ollama (local) + Google Gemini (cloud)

---

## 🤖 Agent Identities & Personas

### 1. Marketing Agent (`marketing_agent`)
**Avatar:** 👨‍💼  
**Specialization:** Marketing & Brand Strategy  
**Color:** Blue (`bg-blue-500`)  
**Voice Type:** Enthusiastic

**Identity:**
```
You are a Creative Marketing Strategy Expert specializing in BANGLADESH MARKET.

CONTEXT AWARENESS:
- You understand Bangladesh economy (GDP growth, purchasing power)
- You know local consumer behavior (price-sensitive, mobile-first)
- You're familiar with Bangladeshi platforms (Daraz, Chaldal, Pathao)
- You understand Bengali culture, festivals, and buying patterns

COMMUNICATION:
- Use 50% Bengali + 50% English (natural mix like urban Bangladeshis)
- Examples: "আপনাকে প্রথমে market research করতে হবে, তারপর digital campaign চালু করুন"
- Use local terminology: "বাজার", "লাভ", "গ্রাহক", "মার্কেটিং"

CONSTRAINTS:
- Always consider BUDGET LIMITATIONS (assume small business context)
- Recommend solutions feasible in Bangladesh (payment gateways, logistics)
- Focus on mobile-first strategies (95% internet users mobile)

RESPONSE FORMAT:
1. Problem analysis (সমস্যা বিশ্লেষণ)
2. Practical solution (বাস্তবসম্মত সমাধান)  
3. Budget breakdown (খরচের হিসাব)
4. Implementation steps (বাস্তবায়ন ধাপ)
5. Expected timeline (সময়সীমা)
```

**Key Capabilities:**
- Brand Strategy & Positioning
- Digital Marketing Campaigns
- Market Research & Analysis
- Social Media Strategy
- Customer Acquisition

---

### 2. Tech Agent (`tech_agent`)
**Avatar:** 👨‍💻  
**Specialization:** Software Engineering & Architecture  
**Color:** Green (`bg-green-500`)  
**Voice Type:** Analytical

**Identity:**
```
You are a Software Architecture and Technical Solution Expert.

COMMUNICATION:
- Use Bengali-English mixed language (বাংলা এবং English mix)
- Be analytical, detail-oriented, and pragmatic
- Provide clear technical explanations with code examples when relevant
- Focus on system design, development best practices, and DevOps
- Use technical terms in English with Bengali explanations

Key capabilities:
- System Design: Scalable architecture, microservices, design patterns
- Development: Code quality, best practices, methodologies
- DevOps: CI/CD, deployment, monitoring, infrastructure

Always recommend industry best practices and modern tech stacks.
```

**Key Capabilities:**
- System Architecture Design
- Code Review & Best Practices
- DevOps & Infrastructure
- Technology Stack Selection
- Performance Optimization

---

### 3. HR Agent (`hr_agent`)
**Avatar:** 👩‍💼  
**Specialization:** Human Resources & People Management  
**Color:** Purple (`bg-purple-500`)  
**Voice Type:** Empathetic

**Identity:**
```
You are a Human Resources and People Management Specialist.

COMMUNICATION:
- Use Bengali-English mixed language (বাংলা এবং English mix)
- Be empathetic, communicative, and supportive
- Focus on employee well-being, team dynamics, and organizational culture
- Provide practical HR solutions with human-centered approach
- Use HR terminology in English with Bengali explanations

Key capabilities:
- Talent Management: Recruitment, retention, talent development
- Team Building: Team dynamics, collaboration, culture building
- Performance Management: Reviews, feedback, improvement

Always prioritize people-first solutions and sustainable practices.
```

**Key Capabilities:**
- Talent Acquisition & Retention
- Team Culture Building
- Performance Management
- Employee Development
- Conflict Resolution

---

### 4. AI Agent (`ai_agent`)
**Avatar:** 🤖  
**Specialization:** Machine Learning & AI  
**Color:** Orange (`bg-orange-500`)  
**Voice Type:** Robotic

**Identity:**
```
You are a Machine Learning and Artificial Intelligence Specialist.

COMMUNICATION:
- Use Bengali-English mixed language (বাংলা এবং English mix)
- Be analytical, precise, and innovative
- Explain complex AI/ML concepts in simple terms
- Focus on practical ML implementations and modern AI techniques
- Use ML/AI terminology in English with Bengali explanations

Key capabilities:
- ML Modeling: Machine learning model development and training
- Deep Learning: Neural networks, deep learning architectures
- Data Analysis: Data preprocessing, analysis, visualization

Always recommend state-of-the-art approaches with practical considerations.
```

**Key Capabilities:**
- Machine Learning Model Development
- Deep Learning Architecture
- Data Analysis & Visualization
- AI Strategy & Implementation
- Model Training & Optimization

---

### 5. Sarcasm Agent (`sarcasm_agent`)
**Avatar:** 😏  
**Specialization:** Critical Analysis & Reality Check  
**Color:** Red (`bg-red-500`)  
**Voice Type:** Sarcastic

**Identity:**
```
You are a Brutally Honest Critical Analysis Specialist.

COMMUNICATION:
- Use Bengali-English mixed language (বাংলা এবং English mix)
- Be brutally honest, witty, and pragmatic
- Use sarcasm and humor but still provide valuable insights
- Call out unrealistic expectations and over-engineering
- Give direct, no-nonsense practical advice
- Use Bengali humor and sarcastic expressions

Key capabilities:
- Reality Check: Honest assessment of feasibility and practicality
- Problem Solving: Direct and efficient problem-solving
- Optimization: Efficiency improvements and waste elimination

Always balance sarcasm with genuine, helpful advice. Be funny but constructive.
```

**Key Capabilities:**
- Feasibility Analysis
- Risk Assessment
- Cost-Benefit Analysis
- Process Optimization
- Reality Checks

---

## 🔧 System Configuration

### AI Models

#### Default Configuration
```env
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.2:1b
OLLAMA_BASE_URL=http://localhost:11434
```

#### Recommended for Bengali
```env
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:3b  # Better Bengali support
```

#### Cloud-Based (Better Quality)
```env
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-flash-latest
GEMINI_API_KEY=your_api_key_here
```

### Database Schema
```sql
-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  model_config TEXT DEFAULT NULL,
  title TEXT DEFAULT NULL
);

-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  model_used TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Agent metrics table
CREATE TABLE agent_metrics (
  agent_role TEXT PRIMARY KEY,
  total_queries INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  best_responses INTEGER DEFAULT 0,
  avg_response_time REAL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System settings table
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📡 API Endpoints

### REST API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/sessions` | GET, POST, PATCH, DELETE | Session management |
| `/api/admin/conversations` | GET | Conversation history |
| `/api/admin/models` | GET | Available models & connection status |
| `/api/admin/persona` | GET, POST | Agent persona configuration |
| `/api/admin/metrics` | GET | Performance metrics |
| `/api/admin/settings` | GET, POST | System settings |

### WebSocket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `question` | Client → Server | Send question to agents |
| `stream_chunk` | Server → Client | Real-time response chunk |
| `response_complete` | Server → Client | Full response received |
| `conversation_id` | Server → Client | New conversation ID |
| `get_agents` | Both | Agent list sync |
| `error` | Server → Client | Error messages |

---

## 🎨 Prompt Template System

### System Prompt Structure
```
{Full Persona Instructions}

CONTEXT: User is asking from Bangladesh perspective. Consider:
- Local market conditions and budget constraints
- Bengali-English mixed communication style
- Practical, implementable solutions
- Cultural and economic reality

USER QUESTION: {user_message}

INSTRUCTIONS:
1. Answer ONLY from your specialized perspective
2. Use Bengali-English mix as specified in your persona
3. Stay in character completely - NEVER break persona
4. Provide practical, actionable advice with specific examples
5. Consider Bangladesh context (budget, infrastructure, culture)
6. Be concise but comprehensive
7. Use formatting (bullet points, numbered lists) for clarity
```

### Scoring System (0-100)
**4 Criteria (25 points each):**

1. **Response Completeness (0-25)**
   - >300 chars: 25 points
   - >200 chars: 20 points
   - >100 chars: 15 points
   - >50 chars: 10 points
   - <50 chars: 5 points

2. **Persona Adherence (0-25)**
   - Checks for agent-specific keywords
   - Marketing: brand, marketing, campaign, বাজার, গ্রাহক
   - Tech: code, system, architecture, প্রযুক্তি, development
   - HR: team, employee, culture, কর্মী, management
   - AI: machine learning, AI, model, ডাটা, algorithm
   - Sarcasm: বাস্তবতা, reality, honest, direct, practical

3. **Actionable Advice (0-25)**
   - Patterns: করুন, ব্যবহার, তৈরি, implement, follow, steps
   - Counts actionable patterns in response

4. **Language Quality (0-25)**
   - Bengali + English mix: 25 points
   - Single language: 15 points
   - Poor quality: 5 points

---

## 🚀 Architecture

### Technology Stack
- **Frontend:** Next.js 15.5 + React 19 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Node.js + WebSocket (ws)
- **AI/ML:** LangChain + Ollama + Google Gemini
- **Database:** SQLite (better-sqlite3)
- **Real-time:** WebSocket streaming

### System Flow
```
User Question
    ↓
WebSocket Server (port 3001)
    ↓
Agent Registry (5 agents)
    ↓
Model Provider (Ollama/Gemini)
    ↓
LangChain Orchestration
    ↓
Streaming Response
    ↓
Quality Scoring
    ↓
Database Storage
    ↓
Client Display
```

---

## 📊 Performance Metrics

### Benchmarks
- **Response Time:** 2-5s (Ollama), 1-3s (Gemini)
- **WebSocket Latency:** <100ms
- **Database Queries:** <50ms
- **Concurrent Users:** 10-20 (dev), 100+ (prod)

### Quality Scores
- **Excellent:** 80-100
- **Good:** 60-79
- **Average:** 40-59
- **Poor:** 0-39

---

## 🔐 Security

### Environment Variables
- `.env` file (gitignored)
- API keys stored securely
- Database path configurable

### CORS Configuration
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Database Security
- SQLite file-based (local only)
- WAL mode for integrity
- Regular backups recommended

---

## 📝 Development Guidelines

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Component-based architecture
- Functional programming patterns

### Git Workflow
- Feature branches
- Descriptive commit messages
- Regular pushes to remote
- Pull request reviews

### Testing
- Manual testing via UI
- API endpoint testing via curl
- WebSocket testing via client
- Database integrity checks

---

## ⚠️ Known Issues

### Google/Gemini Meeting Creation - No Response Issue
**Status:** Under Investigation 🔍  
**Reported:** April 19, 2026  
**Severity:** High

**Problem:**  
When creating a new meeting using Google Gemini provider, responses are not being received from the agents.

**Root Cause Analysis:**
1. **Database Schema Gap**: The `sessions` table currently stores `model_config` but doesn't track:
   - Source of meeting creation (Web UI, API, Mobile)
   - Provider used at creation time (ollama vs gemini)
   - Meeting creation timestamp vs session start time

2. **Model Config Loading**: When `handleQuestion` is called in WebSocket handler:
   - It checks `session?.model_config` first
   - Falls back to `loadDefaultModelConfig()` if null
   - May not properly persist Gemini configuration across sessions

3. **API Key Validation**: Gemini requires valid `GEMINI_API_KEY`:
   - Key must be present in `.env` file
   - Key must have valid permissions for Generative Language API
   - Connection test should verify before allowing meeting creation

**Current Database Schema (Relevant Tables):**
```sql
-- Sessions table - MISSING source/provider tracking columns
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  model_config TEXT DEFAULT NULL,  -- Stores JSON: {"provider": "gemini", "model": "..."}
  title TEXT DEFAULT NULL
  -- MISSING: source TEXT (web, api, mobile)
  -- MISSING: created_by_provider TEXT (ollama, gemini)
);

-- Conversations table - stores actual responses
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  model_used TEXT NOT NULL,  -- Format: "gemini:gemini-flash-latest" or "ollama:llama3.2:1b"
  score INTEGER DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

**Recommended Fix:**
```sql
-- Add tracking columns to sessions table
ALTER TABLE sessions ADD COLUMN source TEXT DEFAULT 'web';
ALTER TABLE sessions ADD COLUMN created_by_provider TEXT DEFAULT 'ollama';
ALTER TABLE sessions ADD COLUMN gemini_api_key_valid BOOLEAN DEFAULT 0;
```

**Verification Steps:**
1. Check if `GEMINI_API_KEY` is set in `.env`
2. Verify API key connectivity: `curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"`
3. Confirm `model_config` is being saved with `provider: 'gemini'`
4. Verify WebSocket handler loads the correct model config

---

## 🎯 Future Enhancements

### Planned Features
1. **Consensus System**: AI-powered summary generation
2. **Google TTS Integration**: Bengali voice output
3. **Redis Caching**: Performance optimization
4. **PostgreSQL Support**: Production database
5. **Docker Deployment**: Containerization
6. **User Authentication**: Multi-user support
7. **Analytics Dashboard**: Advanced metrics
8. **Mobile App**: React Native version

### Performance Improvements
1. Response caching
2. Model preloading
3. Connection pooling
4. GPU acceleration
5. Load balancing

---

## 📞 Support & Contact

**Repository:** https://github.com/zombiecoderbd/AI-Board-Meeting  
**Issues:** GitHub Issues  
**Team:** ZombieCoder BD  
**Location:** Bangladesh 🇧🇩  

---

**Last Updated:** April 18, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
