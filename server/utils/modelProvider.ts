import dotenv from 'dotenv';

dotenv.config();

export interface ModelConfig {
  provider: 'ollama' | 'gemini';
  baseUrl?: string;
  model: string;
  apiKey?: string;
}

export const getModelConfig = (): ModelConfig => {
  const provider = (process.env.AI_PROVIDER || 'ollama') as 'ollama' | 'gemini';
  
  if (provider === 'ollama') {
    return {
      provider: 'ollama',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'qwen3:1.7b',
    };
  }
  
  return {
    provider: 'gemini',
    model: process.env.GEMINI_MODEL || 'gemini-pro',
    apiKey: process.env.GEMINI_API_KEY,
  };
};

export const getAgentModel = (agentId: string, modelOverride?: string): ModelConfig => {
  if (modelOverride) {
    return {
      ...getModelConfig(),
      model: modelOverride,
    };
  }
  
  return getModelConfig();
};
