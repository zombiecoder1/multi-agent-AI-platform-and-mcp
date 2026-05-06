import crypto from 'crypto';
import { createAgentToken, getAgentByToken, deleteAgentToken } from '@/server/db/database';

export const generateToken = (bytes = 24) => {
    return crypto.randomBytes(bytes).toString('hex');
};

export const registerAgent = (agentId: string, name?: string) => {
    const token = generateToken(24);
    createAgentToken(token, agentId, name);
    return { token, agentId, name };
};

export const verifyToken = (token: string) => {
    const record = getAgentByToken(token);
    return record || null;
};

export const revokeToken = (token: string) => {
    deleteAgentToken(token);
};

export default { generateToken, registerAgent, verifyToken, revokeToken };
