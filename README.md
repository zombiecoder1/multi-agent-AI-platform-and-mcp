# 🤖 AI Board Meeting - Multi-Agent AI Discussion Platform

> A sophisticated multi-agent AI platform that enables collaborative decision-making through intelligent agent discussions, specifically optimized for Bangladesh market context.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![WebSocket](https://img.shields.io/badge/WebSocket-Realtime-010101?logo=websocket)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 Features

### 🎯 Core Capabilities
- **Multi-Agent Discussions**: 5 specialized AI agents collaborate to provide comprehensive answers
- **Real-time Streaming**: Live response streaming via WebSocket
- **Intelligent Scoring**: Automated quality assessment (0-100) for each agent response
- **Persona-Based Responses**: Each agent maintains unique expertise and communication style
- **Bangladesh Context**: Optimized for local market conditions and Bengali language

### 🤖 AI Agents
| Agent | Specialization | Avatar |
|-------|---------------|--------|
| **Marketing Agent** | Brand Strategy, Digital Marketing, Market Research | 👨‍💼 |
| **Tech Agent** | Software Architecture, Development, DevOps | 👨‍💻 |
| **HR Agent** | Talent Management, Team Building, Culture | 👩‍💼 |
| **AI Agent** | Machine Learning, Deep Learning, Data Analysis | 🤖 |
| **Sarcasm Agent** | Critical Analysis, Reality Check, Optimization | 😏 |

### 💡 Key Features
- ✅ **Bengali-English Mixed Communication**: Natural language support for Bangladesh
- ✅ **Real-time WebSocket Streaming**: Instant response delivery
- ✅ **Quality Scoring System**: Server-side evaluation of response quality
- ✅ **Session Management**: Track and manage multiple discussion sessions
- ✅ **Admin Dashboard**: Comprehensive monitoring and configuration
- ✅ **Multi-Model Support**: Ollama (local) + Google Gemini (cloud)
- ✅ **SQLite Database**: Persistent storage for conversations and metrics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Ollama (for local AI models)
- Google Gemini API key (optional, for cloud models)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/zombiecoderbd/AI-Board-Meeting.git
cd AI-Board-Meeting
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file:
```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b  # Recommended for Bengali

# Gemini Configuration (optional)
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-flash-latest

# AI Provider Selection (ollama or gemini)
AI_PROVIDER=ollama

# Server Configuration
WEBSOCKET_PORT=3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# SQLite Database
DATABASE_PATH=./data/ai_board.db

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

4. **Install AI Model (Recommended)**
```bash
# For Bengali language support (recommended)
ollama pull qwen2.5:3b

# Or use default
ollama pull llama3.2:1b
```

5. **Start the servers**
```bash
# Start both Next.js and WebSocket server
npm run dev:all

# Or start individually
npm run dev          # Next.js frontend (port 3000)
npm run dev:server   # WebSocket backend (port 3001)
```

6. **Open in browser**
```
http://localhost:3000
```

## 📁 Project Structure

```
AI-Board-Meeting/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard
│   │   ├── meeting/       # Session management
│   │   ├── models/        # Model configuration
│   │   └── persona/       # Agent persona management
│   ├── api/admin/         # Admin API routes
│   ├── page.tsx           # Main application
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   └── ui/               # shadcn/ui components
├── server/               # Backend server
│   ├── agents/           # Agent registry & types
│   ├── db/               # Database operations
│   ├── utils/            # Utilities (LangChain, models)
│   └── websocket/        # WebSocket server & handlers
├── data/                 # SQLite database files
├── utils/                # Frontend utilities
├── public/               # Static assets
└── Qoder/               # Internal documentation
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.5** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **WebSocket Client** - Real-time communication

### Backend
- **Node.js** - Runtime environment
- **WebSocket (ws)** - Real-time server
- **LangChain** - AI/LLM orchestration
- **better-sqlite3** - Database driver
- **Ollama** - Local AI model serving
- **Google Generative AI** - Cloud AI models

### Database
- **SQLite** - Lightweight, file-based database
- **WAL Mode** - Write-ahead logging for performance

## 📊 API Endpoints

### Admin APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/sessions` | GET, POST, DELETE | Manage discussion sessions |
| `/api/admin/conversations` | GET | Fetch conversation history |
| `/api/admin/models` | GET | Available AI models & connection status |
| `/api/admin/persona` | GET, POST | Agent persona configuration |
| `/api/admin/metrics` | GET | Agent performance metrics |
| `/api/admin/settings` | GET, POST | System settings |

### WebSocket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `question` | Client → Server | Send question to agents |
| `stream_chunk` | Server → Client | Real-time response chunk |
| `response_complete` | Server → Client | Full response received |
| `conversation_id` | Server → Client | New conversation ID |
| `get_agents` | Both | Agent list sync |

## 🎯 Usage Examples

### Asking a Question
1. Open the application at `http://localhost:3000`
2. Type your question in the input box
3. Press Enter or click "Ask Board"
4. Watch all 5 agents respond in real-time
5. View scores and best response selection

### Admin Dashboard
1. Navigate to `http://localhost:3000/admin`
2. View session history and metrics
3. Configure AI models and providers
4. Manage agent personas
5. Monitor system performance

### Model Configuration
1. Go to Admin → Models
2. Select provider (Ollama or Gemini)
3. Choose model from available list
4. Click "Save as Default"
5. New sessions will use selected model

## 🔧 Configuration

### AI Model Selection

#### For Bengali Language (Recommended)
```env
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:3b
```

#### For English Only
```env
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.2:1b
```

#### For Cloud-Based (Better Quality)
```env
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-flash-latest
GEMINI_API_KEY=your_key_here
```

### Performance Tuning

```env
# Database optimization (automatic)
# WAL mode enabled by default

# WebSocket connection pooling
# Built-in, no configuration needed

# Response caching
# Add Redis for production (future)
```

## 📈 Performance

### Benchmarks (Local Development)
- **Response Time**: 2-5 seconds (Ollama), 1-3 seconds (Gemini)
- **WebSocket Latency**: <100ms
- **Database Queries**: <50ms
- **Concurrent Users**: 10-20 (development), 100+ (production)

### Optimization Tips
1. Use `qwen2.5:3b` for best Bengali support
2. Enable GPU acceleration in Ollama (if available)
3. Use Gemini Flash for faster responses
4. Implement Redis caching for production

## 🧪 Testing

```bash
# Test WebSocket connection
curl http://localhost:3001/health

# Test API endpoints
curl http://localhost:3000/api/admin/models

# Check database
sqlite3 data/ai_board.db ".tables"
```

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use PostgreSQL instead of SQLite (recommended)
3. Add Redis for caching
4. Configure proper CORS origins
5. Set up SSL certificates
6. Use PM2 or Docker for process management

### Docker (Future)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000 3001
CMD ["npm", "start"]
```

## 📝 Development

### Available Scripts
```bash
npm run dev          # Start Next.js development server
npm run dev:server   # Start WebSocket server
npm run dev:all      # Start both servers (recommended)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Format code
npx prettier --write .
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Development**: ZombieCoder BD Team
- **AI Research**: Bangladesh AI Community
- **Repository**: [github.com/zombiecoderbd/AI-Board-Meeting](https://github.com/zombiecoderbd/AI-Board-Meeting)

## 🙏 Acknowledgments

- **LangChain** - AI orchestration framework
- **Ollama** - Local AI model serving
- **Google AI** - Gemini models
- **Next.js** - React framework
- **shadcn/ui** - Beautiful UI components

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/zombiecoderbd/AI-Board-Meeting/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zombiecoderbd/AI-Board-Meeting/discussions)
- **Email**: Contact via GitHub

## 🌟 Star History

If you find this project useful, please give it a ⭐ star on GitHub!

---

**Built with ❤️ in Bangladesh** 🇧🇩

*Empowering businesses with AI-driven decision making*
# multi-agent-AI-platform-and-mcp
