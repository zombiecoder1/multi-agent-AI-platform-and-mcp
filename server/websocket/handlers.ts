import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { generateStreamingResponse, generateStreamingResponseWithConfig } from '../utils/langchain';
import { getAgentById, getAllAgents } from '../agents/registry';
import { createSession, getSession, createConversation, updateConversation, createMessage, updateSessionStatus, getPersonaOverride, getSystemSetting, getConversationById, getMessagesByConversation } from '../db/database';
import { verifyToken } from '../agents/auth';
import toolRegistry from '../utils/toolRegistry';
import { getModelConfig, ModelConfig } from '../utils/modelProvider';

interface WSMessage {
  type: 'question' | 'stream_chunk' | 'response_complete' | 'error' | 'conversation_id' | 'get_agents' | 'agent_auth' | 'tool_call' | 'tool_result';
  conversationId?: string;
  sessionId?: string;
  agentId?: string;
  message?: string;
  data?: any;
  token?: string;
  toolName?: string;
  args?: any;
  result?: any;
}

interface ConversationContext {
  sessionId: string;
  conversationId: string;
  agentId: string;
  history: Array<{ role: string; content: string }>;
}

const connections = new Map<string, WebSocket>();
const conversationContexts = new Map<string, ConversationContext>();
const authenticatedAgents = new Map<string, string>(); // clientId -> agentId (from token)

// Cache for default model config
let cachedDefaultModelConfig: ModelConfig | null = null;

const normalizeModelConfig = (config: ModelConfig | null): ModelConfig | null => {
  if (!config) return null;

  if (config.provider === 'gemini') {
    return {
      ...config,
      apiKey: config.apiKey || process.env.GEMINI_API_KEY,
    };
  }

  return {
    ...config,
    baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  };
};

const loadDefaultModelConfig = async (): Promise<ModelConfig | null> => {
  if (cachedDefaultModelConfig) {
    return cachedDefaultModelConfig;
  }

  try {
    const setting = getSystemSetting('default_model_config');
    if (setting?.value) {
      cachedDefaultModelConfig = JSON.parse(setting.value);
      console.log('✅ Loaded default model config:', cachedDefaultModelConfig);
      return cachedDefaultModelConfig;
    }
  } catch (error) {
    console.error('Error loading default model config:', error);
  }

  return null;
};

export const initializeWebSocket = (wss: WebSocketServer) => {
  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    const clientId = generateId();
    connections.set(clientId, ws);

    console.log(`Client connected: ${clientId}`);

    ws.on('message', async (message: Buffer) => {
      try {
        const data: WSMessage = JSON.parse(message.toString());
        await handleMessage(clientId, ws, data);
      } catch (error) {
        sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      connections.delete(clientId);
      authenticatedAgents.delete(clientId);
      console.log(`Client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
    });
  });
};

const handleMessage = async (clientId: string, ws: WebSocket, data: WSMessage) => {
  switch (data.type) {
    case 'get_agents':
      sendAgents(ws);
      break;

    case 'agent_auth': {
      const token = data.token;
      if (!token) {
        sendError(ws, 'Authentication token required');
        return;
      }

      const record = verifyToken(token);
      if (!record) {
        sendError(ws, 'Invalid agent token');
        return;
      }

      authenticatedAgents.set(clientId, record.agent_id);
      sendMessage(ws, { type: 'agent_auth', data: { ok: true, agentId: record.agent_id, name: record.name } });
      console.log(`Agent authenticated on connection ${clientId} => ${record.agent_id}`);
    }
      break;

    case 'tool_call': {
      const agentId = authenticatedAgents.get(clientId) || data.agentId;
      if (!agentId) {
        sendError(ws, 'Not authenticated as agent. Send agent_auth with a valid token first.');
        return;
      }

      const tool = data.toolName;
      const args = data.args || {};

      try {
        const result = await toolRegistry.execute(agentId, tool!, args, { sessionId: data.sessionId, conversationId: data.conversationId });
        sendMessage(ws, { type: 'tool_result', data: { tool: tool, result } });
      } catch (e) {
        sendError(ws, `Tool call error: ${String(e)}`);
      }
    }
      break;

    case 'question':
      await handleQuestion(ws, data);
      break;

    default:
      sendError(ws, 'Unknown message type');
  }
};

const handleQuestion = async (ws: WebSocket, data: WSMessage) => {
  if (!data.message || !data.agentId) {
    sendError(ws, 'Message and agentId are required');
    return;
  }

  const agent = getAgentById(data.agentId);
  if (!agent) {
    sendError(ws, `Agent ${data.agentId} not found`);
    return;
  }

  // Get persona override from database if exists
  const personaOverride = getPersonaOverride(data.agentId);
  const effectiveRole = personaOverride?.role || agent.role;

  const sessionId = data.sessionId || generateId();
  const conversationId = data.conversationId || generateId();

  // Ensure session exists
  let session = data.sessionId ? getSession(data.sessionId) : null;
  if (!session) {
    createSession(sessionId);
    session = getSession(sessionId);
  }

  // Parse model config from session or load default
  let modelConfig: ModelConfig | null = null;
  if (session?.model_config) {
    try {
      modelConfig = JSON.parse(session.model_config);
    } catch (e) {
      console.error('Invalid model config:', e);
    }
  }

  // If no session model config, try default
  if (!modelConfig) {
    modelConfig = await loadDefaultModelConfig();
  }

  modelConfig = normalizeModelConfig(modelConfig);

  // Retrieve or initialize conversation context. If an existing conversation is referenced
  // try to load its message history from the DB so follow-ups continue properly.
  let context: ConversationContext | undefined = conversationContexts.get(conversationId);
  if (!context) {
    const existingConv = getConversationById(conversationId);
    if (existingConv) {
      const msgs = getMessagesByConversation(conversationId);
      const history = msgs.map((m: any) => ({ role: m.role, content: m.content }));
      context = {
        sessionId: existingConv.session_id,
        conversationId,
        agentId: data.agentId,
        history,
      };
      conversationContexts.set(conversationId, context);
    } else {
      context = {
        sessionId,
        conversationId,
        agentId: data.agentId,
        history: [],
      };
      conversationContexts.set(conversationId, context);
    }
  }

  // Send conversation ID to client (useful for clients to resume)
  sendMessage(ws, {
    type: 'conversation_id',
    conversationId,
    sessionId,
  });

  // Ensure conversation exists before inserting messages that reference it
  // (messages.conversation_id has a FOREIGN KEY to conversations.id)
  const existingConvBeforeMessages = getConversationById(conversationId);
  if (!existingConvBeforeMessages) {
    const modelUsedForPlaceholder = modelConfig
      ? `${modelConfig.provider}:${modelConfig.model}`
      : (process.env.OLLAMA_MODEL || process.env.GEMINI_MODEL || 'unknown');

    createConversation({
      id: conversationId,
      session_id: sessionId,
      user_message: data.message!,
      agent_response: '',
      agent_role: data.agentId!,
      model_used: modelUsedForPlaceholder,
      score: 0,
    });
  }

  // Append user message to context history and persist as a message immediately
  const history = context.history;
  history.push({ role: 'user', content: data.message });
  try {
    createMessage({ id: generateId(), conversation_id: conversationId, role: 'user', content: data.message });
  } catch (e) {
    // ignore DB errors for messages but log
    console.error('Failed to save user message:', e);
  }

  // Build system prompt using persona
  const systemPrompt = `${effectiveRole}

CONTEXT: User is asking from Bangladesh perspective. Consider:
- Local market conditions and budget constraints
- Bengali-English mixed communication style
- Practical, implementable solutions
- Cultural and economic reality

USER QUESTION: ${data.message}

INSTRUCTIONS:
1. Answer ONLY from your specialized perspective
2. Use Bengali-English mix as specified in your persona
3. Stay in character completely - NEVER break persona
4. Provide practical, actionable advice with specific examples
5. Consider Bangladesh context (budget, infrastructure, culture)
6. Be concise but comprehensive
7. Use formatting (bullet points, numbered lists) for clarity`;

  // Generate streaming response with custom model config if available
  let fullResponse = '';

  const generateFn = modelConfig
    ? (system: string, msg: string, hist: any, cbs: any) => generateStreamingResponseWithConfig(system, msg, hist, modelConfig!, cbs)
    : generateStreamingResponse;

  await generateFn(
    systemPrompt,
    data.message,
    history,
    {
      onChunk: (chunk: string) => {
        fullResponse += chunk;
        sendMessage(ws, {
          type: 'stream_chunk',
          conversationId,
          data: { chunk, agentId: data.agentId },
        });
      },
      onComplete: (response: string) => {
        // Save to database with model info
        const modelUsed = modelConfig
          ? `${modelConfig.provider}:${modelConfig.model}`
          : (process.env.OLLAMA_MODEL || process.env.GEMINI_MODEL || 'unknown');

        // Calculate quality score BEFORE saving
        const score = calculateQualityScore(response, data.agentId!);

        // Finalize the conversation record (placeholder is created before message inserts)
        updateConversation(conversationId, {
          agent_response: response,
          model_used: modelUsed,
          score,
        } as any);

        try {
          createMessage({ id: generateId(), conversation_id: conversationId, role: 'assistant', content: response });
        } catch (e) {
          console.error('Failed to save assistant message:', e);
        }

        // Update context history
        context!.history.push({ role: 'assistant', content: response });

        sendMessage(ws, {
          type: 'response_complete',
          conversationId,
          data: {
            response,
            agentId: data.agentId,
            sessionId,
          },
        });
      },
      onError: (error: Error) => {
        sendError(ws, `Error generating response: ${error.message}`);
      },
    }
  );
};

const sendAgents = (ws: WebSocket) => {
  const agents = getAllAgents().map(agent => ({
    id: agent.id,
    name: agent.name,
    specialization: agent.specialization,
    avatar: agent.avatar,
    color: agent.color,
    voiceType: agent.voiceType,
  }));

  sendMessage(ws, {
    type: 'get_agents',
    data: { agents },
  });
};

const sendMessage = (ws: WebSocket, message: WSMessage) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

const sendError = (ws: WebSocket, errorMessage: string) => {
  sendMessage(ws, {
    type: 'error',
    data: { error: errorMessage },
  });
};

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Server-side quality scoring system
const calculateQualityScore = (response: string, agentId: string): number => {
  let score = 0;

  // 1. Response completeness (0-25 points)
  if (response.length > 300) score += 25;
  else if (response.length > 200) score += 20;
  else if (response.length > 100) score += 15;
  else if (response.length > 50) score += 10;
  else score += 5;

  // 2. Persona adherence (0-25 points)
  const personaKeywords: Record<string, string[]> = {
    'marketing_agent': ['brand', 'marketing', 'campaign', 'বাজার', 'গ্রাহক', 'digital', 'social media'],
    'tech_agent': ['code', 'system', 'architecture', 'প্রযুক্তি', 'development', 'software', 'implementation'],
    'hr_agent': ['team', 'employee', 'culture', 'কর্মী', 'management', 'recruitment', 'performance'],
    'ai_agent': ['machine learning', 'AI', 'model', 'ডাটা', 'algorithm', 'training', 'neural'],
    'sarcasm_agent': ['বাস্তবতা', 'reality', 'honest', 'direct', 'practical', 'সততা']
  };

  const keywords = personaKeywords[agentId] || [];
  const keywordMatches = keywords.filter(kw => response.toLowerCase().includes(kw.toLowerCase())).length;
  score += Math.min((keywordMatches / Math.max(keywords.length * 0.5, 1)) * 25, 25);

  // 3. Actionable advice (0-25 points)
  const actionablePatterns = [
    /করুন/g, /ব্যবহার/g, /তৈরি/g, /implement/g, /follow/g, /steps?/g,
    /প্রথম/g, /তারপর/g, /finally/g, /step \d+/g
  ];
  const actionableMatches = actionablePatterns.filter(pattern => pattern.test(response)).length;
  score += Math.min((actionableMatches / 3) * 25, 25);

  // 4. Language quality - Bengali-English mix (0-25 points)
  const hasBengali = /[\u0980-\u09FF]/.test(response);
  const hasEnglish = /[a-zA-Z]{3,}/.test(response);
  if (hasBengali && hasEnglish) score += 25;  // Good mix
  else if (hasBengali || hasEnglish) score += 15;  // Single language
  else score += 5;

  return Math.min(Math.round(score), 100);
};

export { connections, conversationContexts };
