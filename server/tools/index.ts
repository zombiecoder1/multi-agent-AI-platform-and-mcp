import fs from 'fs';
import path from 'path';
import { generateResponse } from '../utils/langchain';
import { getAgentById } from '../agents/registry';

export const searchRepo = async (query: string, maxResults = 20) => {
    const roots = ['docs', 'server', 'app', 'components', 'utils', 'public'];
    const results: Array<{ file: string; snippet: string; line: number }> = [];

    const searchInFile = async (filePath: string) => {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const lines = content.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                    const snippet = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n');
                    results.push({ file: filePath, snippet, line: i + 1 });
                    if (results.length >= maxResults) return;
                }
            }
        } catch (e) {
            // ignore unreadable files
        }
    };

    const walk = async (dir: string) => {
        let entries: string[] = [];
        try {
            entries = await fs.promises.readdir(dir);
        } catch (e) {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry);
            try {
                const stat = await fs.promises.stat(full);
                if (stat.isDirectory()) {
                    await walk(full);
                } else if (stat.isFile()) {
                    await searchInFile(full);
                    if (results.length >= maxResults) return;
                }
            } catch (e) {
                // ignore
            }
        }
    };

    for (const root of roots) {
        const p = path.join(process.cwd(), root);
        await walk(p);
        if (results.length >= maxResults) break;
    }

    return results;
};

export const saveSnippet = async (agentId: string, code: string, filename?: string) => {
    const dir = path.join(process.cwd(), 'data', 'snippets');
    await fs.promises.mkdir(dir, { recursive: true });
    const name = filename || `${agentId}-${Date.now()}.txt`;
    const filePath = path.join(dir, name);
    await fs.promises.writeFile(filePath, code, 'utf8');
    return { path: filePath };
};

export const invokeLLM = async (agentId: string, prompt: string) => {
    const agent = getAgentById(agentId);
    const systemPrompt = agent ? agent.role : 'You are a helpful assistant.';
    try {
        const out = await generateResponse(systemPrompt, prompt, []);
        return { output: out };
    } catch (e) {
        return { error: String(e) };
    }
};

export default { searchRepo, saveSnippet, invokeLLM };
