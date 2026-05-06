const crypto = require('crypto')
const path = require('path')
const BetterSqlite3 = require('better-sqlite3')

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'ai_board.db')
const db = new BetterSqlite3(dbPath)

const agentId = process.argv[2] || 'techAgent'
const name = process.argv[3] || 'sim-agent'
const title = process.argv[4] || 'sim-session'

const token = crypto.randomBytes(24).toString('hex')
const sessionId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`

try {
    db.prepare('INSERT INTO agent_tokens (token, agent_id, name) VALUES (?, ?, ?)').run(token, agentId, name)
} catch (e) {
    console.error('Failed to insert agent token:', e.message)
    process.exit(1)
}

try {
    db.prepare('INSERT INTO sessions (id, title) VALUES (?, ?)').run(sessionId, title)
} catch (e) {
    console.error('Failed to insert session:', e.message)
    process.exit(1)
}

console.log(JSON.stringify({ token, agentId, sessionId }))
