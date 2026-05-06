import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getModelConfig, ModelConfig } from './modelProvider';

export interface StreamingCallback {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

const createModel = (config: ModelConfig) => {
  if (config.provider === 'ollama') {
    return new ChatOllama({
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: 0.7,
    });
  }
  
  if (!config.apiKey) {
    throw new Error('GEMINI_API_KEY is required when using Gemini provider');
  }
  
  return new ChatGoogleGenerativeAI({
    model: config.model,
    apiKey: config.apiKey,
    temperature: 0.7,
  });
};

export const generateStreamingResponseWithConfig = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  modelConfig: ModelConfig,
  callbacks: StreamingCallback
): Promise<void> => {
  try {
    console.log(`🤖 Creating model: ${modelConfig.provider}:${modelConfig.model}`);
    const model = createModel(modelConfig);
    
    const messages = [
      new SystemMessage(systemPrompt),
      ...conversationHistory.map(msg => 
        msg.role === 'user' 
          ? new HumanMessage(msg.content)
          : new HumanMessage(msg.content)
      ),
      new HumanMessage(userMessage),
    ];
    
    console.log(`📤 Sending request to ${modelConfig.provider}...`);
    const stream = await model.stream(messages);
    
    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.content as string;
      fullResponse += content;
      callbacks.onChunk(content);
    }
    
    console.log(`✅ Response complete (${fullResponse.length} chars)`);
    callbacks.onComplete(fullResponse);
  } catch (error: any) {
    const status = error?.status || error?.response?.status || error?.cause?.status;
    const msg = error?.message || String(error);

    if (modelConfig.provider === 'gemini' && status === 429) {
      console.error(`❌ ${modelConfig.provider} Error:`, msg);
      callbacks.onError(new Error(`Gemini rate limit exceeded (429). Try fewer agents or retry in a few seconds.`));
      return;
    }

    console.error(`❌ ${modelConfig.provider} Error:`, msg);
    console.error('Full error:', error);
    callbacks.onError(error as Error);
  }
};

export const generateStreamingResponse = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  callbacks: StreamingCallback
): Promise<void> => {
  try {
    const config = getModelConfig();
    const model = createModel(config);
    
    const messages = [
      new SystemMessage(systemPrompt),
      ...conversationHistory.map(msg => 
        msg.role === 'user' 
          ? new HumanMessage(msg.content)
          : new HumanMessage(msg.content)
      ),
      new HumanMessage(userMessage),
    ];
    
    const stream = await model.stream(messages);
    
    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.content as string;
      fullResponse += content;
      callbacks.onChunk(content);
    }
    
    callbacks.onComplete(fullResponse);
  } catch (error) {
    callbacks.onError(error as Error);
  }
};

export const generateResponse = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> => {
  const config = getModelConfig();
  const model = createModel(config);
  
  const messages = [
    new SystemMessage(systemPrompt),
    ...conversationHistory.map(msg => 
      msg.role === 'user' 
        ? new HumanMessage(msg.content)
        : new HumanMessage(msg.content)
    ),
    new HumanMessage(userMessage),
  ];
  
  const response = await model.invoke(messages);
  return response.content as string;
};
