import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import * as coreTools from '../tools';
import { getAgentTools as dbGetAgentTools, setAgentTools as dbSetAgentTools, addAgentTool as dbAddAgentTool, removeAgentTool as dbRemoveAgentTool } from '../db/database';

const execFileAsync = util.promisify(execFile);

export type ToolRunContext = {
    agentId: string;
    sessionId?: string;
    conversationId?: string;
};

export type ToolDefinition = {
    name: string;
    description: string;
    run: (args: any, ctx: ToolRunContext) => Promise<any>;
    allowedAgents?: string[]; // optional static allowlist
    config?: any;
};

class ToolRegistry {
    private tools = new Map<string, ToolDefinition>();

    register(tool: ToolDefinition) {
        if (!tool || !tool.name) throw new Error('Tool must have a name');
        this.tools.set(tool.name, tool);
    }

    get(name: string) {
        return this.tools.get(name) || null;
    }

    list() {
        return Array.from(this.tools.values()).map(t => ({ name: t.name, description: t.description }));
    }

    async execute(agentId: string, name: string, args: any, ctx: Partial<ToolRunContext> = {}) {
        const tool = this.get(name);
        if (!tool) throw new Error(`Unknown tool: ${name}`);

        const allowed = await this.hasAgentAccess(agentId, name, tool);
        if (!allowed) throw new Error(`Agent ${agentId} not allowed to use tool ${name}`);

        return tool.run(args || {}, { agentId, sessionId: ctx.sessionId, conversationId: ctx.conversationId });
    }

    async hasAgentAccess(agentId: string, toolName: string, toolDef?: ToolDefinition) {
        // Static allowlist on tool definition
        if (toolDef?.allowedAgents && toolDef.allowedAgents.length > 0) {
            return toolDef.allowedAgents.includes(agentId);
        }

        // DB-configured list takes precedence
        const rows = dbGetAgentTools(agentId);
        if (!rows || rows.length === 0) return false;
        return rows.some((r: any) => r.tool === toolName);
    }

    // Assign tools to agent (overwrites)
    assignToolsToAgent(agentId: string, tools: Array<{ tool: string; config?: any }>) {
        dbSetAgentTools(agentId, tools || []);
    }

    addToolToAgent(agentId: string, tool: string, config?: any) {
        dbAddAgentTool(agentId, tool, config || null);
    }

    removeToolFromAgent(agentId: string, tool: string) {
        dbRemoveAgentTool(agentId, tool);
    }
}

const registry = new ToolRegistry();

// Helper: ensure path is inside repo
const resolveSafePath = (p: string) => {
    const repoRoot = process.cwd();
    const resolved = path.resolve(repoRoot, p);
    if (!resolved.startsWith(repoRoot)) throw new Error('Path outside repository not allowed');
    return resolved;
};

// Built-in tools
registry.register({
    name: 'search_repo',
    description: 'Search repository files for a query',
    run: async (args) => {
        const q = String(args.query || '');
        const max = parseInt(args.maxResults || 20, 10) || 20;
        return await coreTools.searchRepo(q, max);
    }
});

registry.register({
    name: 'save_snippet',
    description: 'Save a code snippet to data/snippets',
    run: async (args, ctx) => {
        const code = String(args.code || '');
        const filename = args.filename || `${ctx.agentId || 'agent'}-${Date.now()}.txt`;
        return await coreTools.saveSnippet(ctx.agentId, code, filename);
    }
});

registry.register({
    name: 'invoke_llm',
    description: 'Invoke LLM with a prompt and return result',
    run: async (args, ctx) => {
        const prompt = String(args.prompt || '');
        return await coreTools.invokeLLM(ctx.agentId, prompt);
    }
});

registry.register({
    name: 'read_file',
    description: 'Read a file from the repository (safe, no traversal)',
    run: async (args) => {
        const p = String(args.path || '');
        const resolved = resolveSafePath(p);
        const content = await fs.promises.readFile(resolved, 'utf8');
        return { path: resolved, content };
    }
});

registry.register({
    name: 'write_file',
    description: 'Write a file to allowed directories (configurable)',
    run: async (args) => {
        const p = String(args.path || '');
        const content = String(args.content || '');

        const allowListEnv = process.env.TOOL_WRITE_ALLOWLIST || 'data,snippets';
        const allowList = allowListEnv.split(',').map(s => s.trim()).filter(Boolean);

        const resolved = resolveSafePath(p);
        const allowed = allowList.some(seg => resolved.includes(path.join(process.cwd(), seg)));
        if (!allowed) throw new Error('Write path not allowed');

        await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
        await fs.promises.writeFile(resolved, content, 'utf8');
        return { path: resolved };
    }
});

registry.register({
    name: 'git_status',
    description: 'Run git status --porcelain',
    run: async () => {
        const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: process.cwd() });
        return { status: stdout.trim() };
    }
});

registry.register({
    name: 'git_log',
    description: 'Return recent git commits',
    run: async (args) => {
        const n = String(args.n || '50');
        const { stdout } = await execFileAsync('git', ['log', `-n`, n, '--pretty=format:%H|%an|%ad|%s'], { cwd: process.cwd() });
        const lines = stdout.split(/\r?\n/).filter(Boolean).map(l => {
            const [hash, author, date, ...msg] = l.split('|');
            return { hash, author, date, message: msg.join('|') };
        });
        return lines;
    }
});

registry.register({
    name: 'git_diff',
    description: 'Show git diff for commits or file',
    run: async (args) => {
        const a = args.a || args.commitA || 'HEAD';
        const b = args.b || args.commitB || '--';
        const file = args.file;
        const cmdArgs = ['diff', a, b];
        if (file) cmdArgs.push('--', String(file));
        const { stdout } = await execFileAsync('git', cmdArgs, { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 });
        return { diff: stdout };
    }
});

// Export singleton
export default registry;
