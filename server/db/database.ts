import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const getEnvVar = (key: string): string | undefined => process.env[key]

const dbPath = getEnvVar('DATABASE_PATH') || './data/ai_board.db'
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

// Attempt to load better-sqlite3; fall back to JSON file store when unavailable
let BetterSqlite3: any = null
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    BetterSqlite3 = require('better-sqlite3')
} catch (e) {
    console.warn('better-sqlite3 not available — using JSON fallback DB for development')
}

// Expose a `db` variable with a `close()` method for graceful shutdown compatibility
let db: any = null

// Declarations for exported functions (will be defined below for both backends)
let createSession: any
let getSession: any
let getAllSessions: any
let updateSessionModelConfig: any
let updateSessionStatus: any
let deleteSessionPermanently: any
let deleteSessionsPermanently: any
let createConversation: any
let updateConversation: any
let getConversationsBySession: any
let getConversationById: any
let createMessage: any
let getMessagesByConversation: any
let updateAgentMetrics: any
let getAllAgentMetrics: any
let getSessionStats: any
let getPersonaOverride: any
let getAllPersonaOverrides: any
let savePersonaOverride: any
let deletePersonaOverride: any
let createAgentToken: any
let getAgentByToken: any
let deleteAgentToken: any
let getAllAgentTokens: any
let getAgentTools: any
let setAgentTools: any
let addAgentTool: any
let removeAgentTool: any
let getSystemSetting: any
let setSystemSetting: any

if (BetterSqlite3) {
    // --- SQLite implementation ---
    db = new BetterSqlite3(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    const initializeDatabase = () => {
        db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS conversations (
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

      CREATE TABLE IF NOT EXISTS agent_metrics (
        agent_role TEXT PRIMARY KEY,
        total_queries INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        best_responses INTEGER DEFAULT 0,
        avg_response_time REAL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_role);

      CREATE TABLE IF NOT EXISTS agent_persona_overrides (
        agent_id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)

        db.exec(`
      CREATE TABLE IF NOT EXISTS agent_tokens(
        token TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)

        db.exec(`
      CREATE TABLE IF NOT EXISTS agent_tools (
        agent_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        config TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (agent_id, tool_name)
      );
    `)

        try {
            db.exec(`ALTER TABLE sessions ADD COLUMN model_config TEXT DEFAULT NULL;`)
        } catch (e: any) {
            if (!String(e.message).includes('duplicate column')) console.error('migration model_config', e.message)
        }

        try {
            db.exec(`ALTER TABLE sessions ADD COLUMN title TEXT DEFAULT NULL;`)
        } catch (e: any) {
            if (!String(e.message).includes('duplicate column')) console.error('migration title', e.message)
        }
    }

    // Implement exported functions using sqlite statements
    createSession = (id: string, modelConfig?: string, title?: string) => {
        const stmt = db.prepare('INSERT INTO sessions (id, model_config, title) VALUES (?, ?, ?)')
        stmt.run(id, modelConfig || null, title || null)
        return { id }
    }

    getSession = (id: string) => db.prepare('SELECT * FROM sessions WHERE id = ?').get(id)

    getAllSessions = () => db.prepare(`
    SELECT s.*, COUNT(c.id) as conversation_count
    FROM sessions s
    LEFT JOIN conversations c ON s.id = c.session_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all()

    updateSessionModelConfig = (id: string, modelConfig: string) => db.prepare('UPDATE sessions SET model_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(modelConfig, id)

    updateSessionStatus = (id: string, status: string) => db.prepare('UPDATE sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id)

    deleteSessionPermanently = (sessionId: string) => {
        const deleteMessagesBySession = db.prepare(`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE session_id = ?)`)
        const deleteConversationsBySession = db.prepare('DELETE FROM conversations WHERE session_id = ?')
        const deleteSessionStmt = db.prepare('DELETE FROM sessions WHERE id = ?')
        const tx = db.transaction((id: string) => {
            deleteMessagesBySession.run(id)
            deleteConversationsBySession.run(id)
            deleteSessionStmt.run(id)
        })
        tx(sessionId)
    }

    deleteSessionsPermanently = (sessionIds: string[]) => {
        const unique = Array.from(new Set(sessionIds)).filter(Boolean)
        if (unique.length === 0) return
        const tx = db.transaction((ids: string[]) => { ids.forEach(id => deleteSessionPermanently(id)) })
        tx(unique)
    }

    createConversation = (data: any) => {
        const stmt = db.prepare(`INSERT INTO conversations (id, session_id, user_message, agent_response, agent_role, model_used, score) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        stmt.run(data.id, data.session_id, data.user_message, data.agent_response, data.agent_role, data.model_used, data.score || 0)
        updateAgentMetrics(data.agent_role, data.score || 0)
        return { id: data.id }
    }

    updateConversation = (id: string, data: any) => {
        const existing = getConversationById(id)
        if (!existing) return null
        const stmt = db.prepare(`
      UPDATE conversations SET
        agent_response = COALESCE(?, agent_response),
        model_used = COALESCE(?, model_used),
        score = COALESCE(?, score),
        timestamp = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
        stmt.run(data.agent_response ?? null, data.model_used ?? null, typeof data.score === 'number' ? data.score : null, id)
        return getConversationById(id)
    }

    getConversationsBySession = (sessionId: string) => db.prepare('SELECT * FROM conversations WHERE session_id = ? ORDER BY timestamp DESC').all(sessionId)

    getConversationById = (id: string) => db.prepare('SELECT * FROM conversations WHERE id = ?').get(id)

    createMessage = (data: any) => {
        const stmt = db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
        stmt.run(data.id, data.conversation_id, data.role, data.content)
        return { id: data.id }
    }

    getMessagesByConversation = (conversationId: string) => db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC').all(conversationId)

    updateAgentMetrics = (agentRole: string, score: number) => {
        const existing = db.prepare('SELECT * FROM agent_metrics WHERE agent_role = ?').get(agentRole)
        if (existing) {
            const stmt = db.prepare(`
        UPDATE agent_metrics 
        SET total_queries = total_queries + 1,
            total_score = total_score + ?,
            best_responses = best_responses + CASE WHEN ? >= (SELECT MAX(score) FROM conversations WHERE agent_role = ?) THEN 1 ELSE 0 END,
            avg_response_time = (total_score + ?) / (total_queries + 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE agent_role = ?
      `)
            stmt.run(score, score, agentRole, score, agentRole)
        } else {
            const stmt = db.prepare(`INSERT INTO agent_metrics (agent_role, total_queries, total_score, best_responses, avg_response_time) VALUES (?, 1, ?, CASE WHEN ? >= 90 THEN 1 ELSE 0 END, ?)`)
            stmt.run(agentRole, score, score, score)
        }
    }

    getAllAgentMetrics = () => db.prepare('SELECT * FROM agent_metrics ORDER BY total_queries DESC').all()

    getSessionStats = (sessionId: string) => db.prepare(`
    SELECT 
      COUNT(*) as total_conversations,
      AVG(score) as avg_score,
      MAX(score) as best_score,
      MIN(score) as worst_score
    FROM conversations 
    WHERE session_id = ?
  `).get(sessionId)

    getPersonaOverride = (agentId: string) => db.prepare('SELECT * FROM agent_persona_overrides WHERE agent_id = ?').get(agentId)
    getAllPersonaOverrides = () => db.prepare('SELECT * FROM agent_persona_overrides').all()
    savePersonaOverride = (agentId: string, role: string) => { db.prepare(`INSERT INTO agent_persona_overrides (agent_id, role, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(agent_id) DO UPDATE SET role = excluded.role, updated_at = CURRENT_TIMESTAMP`).run(agentId, role); return { agentId } }
    deletePersonaOverride = (agentId: string) => db.prepare('DELETE FROM agent_persona_overrides WHERE agent_id = ?').run(agentId)

    createAgentToken = (token: string, agentId: string, name?: string) => { db.prepare('INSERT INTO agent_tokens (token, agent_id, name) VALUES (?, ?, ?)').run(token, agentId, name || null); return { token, agentId } }
    getAgentByToken = (token: string) => db.prepare('SELECT * FROM agent_tokens WHERE token = ?').get(token)
    deleteAgentToken = (token: string) => db.prepare('DELETE FROM agent_tokens WHERE token = ?').run(token)
    getAllAgentTokens = () => db.prepare('SELECT * FROM agent_tokens ORDER BY created_at DESC').all()

    getAgentTools = (agentId: string) => {
        const rows = db.prepare('SELECT tool_name, config, created_at FROM agent_tools WHERE agent_id = ? ORDER BY created_at DESC').all(agentId)
        return rows.map((r: any) => ({ tool: r.tool_name, config: r.config ? JSON.parse(r.config) : null, created_at: r.created_at }))
    }

    setAgentTools = (agentId: string, tools: Array<{ tool: string; config?: any }>) => {
        const del = db.prepare('DELETE FROM agent_tools WHERE agent_id = ?')
        const ins = db.prepare('INSERT INTO agent_tools (agent_id, tool_name, config) VALUES (?, ?, ?)')
        const tx = db.transaction((id: string, toolsList: Array<{ tool: string; config?: any }>) => { del.run(id); for (const t of toolsList || []) ins.run(id, t.tool, t.config ? JSON.stringify(t.config) : null) })
        tx(agentId, tools)
    }

    addAgentTool = (agentId: string, tool: string, config?: any) => db.prepare('INSERT OR REPLACE INTO agent_tools (agent_id, tool_name, config) VALUES (?, ?, ?)').run(agentId, tool, config ? JSON.stringify(config) : null)
    removeAgentTool = (agentId: string, tool: string) => db.prepare('DELETE FROM agent_tools WHERE agent_id = ? AND tool_name = ?').run(agentId, tool)

    getSystemSetting = (key: string) => db.prepare('SELECT * FROM system_settings WHERE key = ?').get(key)
    setSystemSetting = (key: string, value: string) => db.prepare(`INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`).run(key, value)

    initializeDatabase()

} else {
    // --- JSON file + in-memory fallback implementation ---
    const storePath = path.join(dbDir, 'ai_board.json')
    let store: any = null

    const defaultStore = () => ({
        sessions: [],
        conversations: [],
        messages: [],
        agent_metrics: [],
        agent_persona_overrides: [],
        system_settings: [],
        agent_tokens: [],
        agent_tools: [],
    })

    const loadStore = () => {
        try {
            if (fs.existsSync(storePath)) {
                const raw = fs.readFileSync(storePath, 'utf8')
                store = JSON.parse(raw)
            } else {
                store = defaultStore()
                fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8')
            }
        } catch (e) {
            console.error('Failed to load fallback DB, using fresh store', e)
            store = defaultStore()
        }
    }

    const persist = () => {
        try {
            fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8')
        } catch (e) {
            console.error('Failed to persist fallback DB', e)
        }
    }

    loadStore()

    db = { close: () => {/* noop */ } }

    createSession = (id: string, modelConfig?: string, title?: string) => {
        const now = new Date().toISOString()
        store.sessions.push({ id, created_at: now, updated_at: now, status: 'active', model_config: modelConfig || null, title: title || null })
        persist()
        return { id }
    }

    getSession = (id: string) => store.sessions.find((s: any) => s.id === id) || null

    getAllSessions = () => store.sessions.map((s: any) => ({ ...s, conversation_count: store.conversations.filter((c: any) => c.session_id === s.id).length })).sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))

    updateSessionModelConfig = (id: string, modelConfig: string) => { const s = getSession(id); if (s) { s.model_config = modelConfig; s.updated_at = new Date().toISOString(); persist() } }
    updateSessionStatus = (id: string, status: string) => { const s = getSession(id); if (s) { s.status = status; s.updated_at = new Date().toISOString(); persist() } }

    deleteSessionPermanently = (sessionId: string) => {
        const convs = store.conversations.filter((c: any) => c.session_id === sessionId)
        const convIds = convs.map((c: any) => c.id)
        store.messages = store.messages.filter((m: any) => !convIds.includes(m.conversation_id))
        store.conversations = store.conversations.filter((c: any) => c.session_id !== sessionId)
        store.sessions = store.sessions.filter((s: any) => s.id !== sessionId)
        persist()
    }

    deleteSessionsPermanently = (sessionIds: string[]) => { const unique = Array.from(new Set(sessionIds)).filter(Boolean); unique.forEach(id => deleteSessionPermanently(id)) }

    createConversation = (data: any) => { store.conversations.push({ ...data, timestamp: new Date().toISOString() }); updateAgentMetrics(data.agent_role, data.score || 0); persist(); return { id: data.id } }

    updateConversation = (id: string, data: any) => { const idx = store.conversations.findIndex((c: any) => c.id === id); if (idx === -1) return null; store.conversations[idx] = { ...store.conversations[idx], agent_response: data.agent_response ?? store.conversations[idx].agent_response, model_used: data.model_used ?? store.conversations[idx].model_used, score: typeof data.score === 'number' ? data.score : store.conversations[idx].score, timestamp: new Date().toISOString() }; persist(); return store.conversations[idx] }

    getConversationsBySession = (sessionId: string) => store.conversations.filter((c: any) => c.session_id === sessionId).sort((a: any, b: any) => a.timestamp < b.timestamp ? 1 : -1)
    getConversationById = (id: string) => store.conversations.find((c: any) => c.id === id) || null

    createMessage = (data: any) => { store.messages.push({ ...data, timestamp: new Date().toISOString() }); persist(); return { id: data.id } }
    getMessagesByConversation = (conversationId: string) => store.messages.filter((m: any) => m.conversation_id === conversationId).sort((a: any, b: any) => a.timestamp < b.timestamp ? -1 : 1)

    updateAgentMetrics = (agentRole: string, score: number) => {
        let row = store.agent_metrics.find((r: any) => r.agent_role === agentRole)
        if (row) {
            row.total_queries = (row.total_queries || 0) + 1
            row.total_score = (row.total_score || 0) + score
            if (score >= 90) row.best_responses = (row.best_responses || 0) + 1
            row.avg_response_time = row.total_score / row.total_queries
        } else {
            row = { agent_role: agentRole, total_queries: 1, total_score: score, best_responses: score >= 90 ? 1 : 0, avg_response_time: score }
            store.agent_metrics.push(row)
        }
        persist()
    }

    getAllAgentMetrics = () => store.agent_metrics.sort((a: any, b: any) => (b.total_queries || 0) - (a.total_queries || 0))

    getSessionStats = (sessionId: string) => {
        const convs = store.conversations.filter((c: any) => c.session_id === sessionId)
        const scores = convs.map((c: any) => c.score || 0)
        return {
            total_conversations: convs.length,
            avg_score: scores.length ? scores.reduce((a: any, b: any) => a + b, 0) / scores.length : null,
            best_score: scores.length ? Math.max(...scores) : null,
            worst_score: scores.length ? Math.min(...scores) : null,
        }
    }

    getPersonaOverride = (agentId: string) => store.agent_persona_overrides.find((p: any) => p.agent_id === agentId) || null
    getAllPersonaOverrides = () => store.agent_persona_overrides
    savePersonaOverride = (agentId: string, role: string) => { const existing = store.agent_persona_overrides.find((p: any) => p.agent_id === agentId); if (existing) { existing.role = role; existing.updated_at = new Date().toISOString() } else { store.agent_persona_overrides.push({ agent_id: agentId, role, updated_at: new Date().toISOString() }) } persist(); return { agentId } }
    deletePersonaOverride = (agentId: string) => { store.agent_persona_overrides = store.agent_persona_overrides.filter((p: any) => p.agent_id !== agentId); persist() }

    createAgentToken = (token: string, agentId: string, name?: string) => { store.agent_tokens.unshift({ token, agent_id: agentId, name: name || null, created_at: new Date().toISOString() }); persist(); return { token, agentId } }
    getAgentByToken = (token: string) => store.agent_tokens.find((t: any) => t.token === token) || null
    deleteAgentToken = (token: string) => { store.agent_tokens = store.agent_tokens.filter((t: any) => t.token !== token); persist() }
    getAllAgentTokens = () => store.agent_tokens.slice().sort((a: any, b: any) => a.created_at < b.created_at ? 1 : -1)

    getAgentTools = (agentId: string) => store.agent_tools.filter((r: any) => r.agent_id === agentId).map((r: any) => ({ tool: r.tool_name, config: r.config ? JSON.parse(r.config) : null, created_at: r.created_at }))
    setAgentTools = (agentId: string, tools: Array<{ tool: string; config?: any }>) => { store.agent_tools = store.agent_tools.filter((r: any) => r.agent_id !== agentId); for (const t of tools || []) store.agent_tools.push({ agent_id: agentId, tool_name: t.tool, config: t.config ? JSON.stringify(t.config) : null, created_at: new Date().toISOString() }); persist() }
    addAgentTool = (agentId: string, tool: string, config?: any) => { const exist = store.agent_tools.find((r: any) => r.agent_id === agentId && r.tool_name === tool); if (exist) { exist.config = config ? JSON.stringify(config) : null } else { store.agent_tools.push({ agent_id: agentId, tool_name: tool, config: config ? JSON.stringify(config) : null, created_at: new Date().toISOString() }) } persist() }
    removeAgentTool = (agentId: string, tool: string) => { store.agent_tools = store.agent_tools.filter((r: any) => !(r.agent_id === agentId && r.tool_name === tool)); persist() }

    getSystemSetting = (key: string) => store.system_settings.find((s: any) => s.key === key) || null
    setSystemSetting = (key: string, value: string) => { const s = store.system_settings.find((s: any) => s.key === key); if (s) { s.value = value; s.updated_at = new Date().toISOString() } else { store.system_settings.push({ key, value, updated_at: new Date().toISOString() }) } persist() }

}

export {
    db,
    createSession,
    getSession,
    getAllSessions,
    updateSessionStatus,
    updateSessionModelConfig,
    deleteSessionPermanently,
    deleteSessionsPermanently,
    createConversation,
    updateConversation,
    getConversationsBySession,
    getConversationById,
    createMessage,
    getMessagesByConversation,
    getAllAgentMetrics,
    getSessionStats,
    getPersonaOverride,
    getAllPersonaOverrides,
    savePersonaOverride,
    deletePersonaOverride,
    createAgentToken,
    getAgentByToken,
    deleteAgentToken,
    getAllAgentTokens,
    getAgentTools,
    setAgentTools,
    addAgentTool,
    removeAgentTool,
    getSystemSetting,
    setSystemSetting,
}
