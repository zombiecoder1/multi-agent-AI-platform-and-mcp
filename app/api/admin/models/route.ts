import { NextResponse } from 'next/server';

const GEMINI_MODELS = [
  { id: 'gemini-flash-latest', name: 'Gemini Flash (Latest)', description: 'Fast and efficient' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Latest flash model' },
  { id: 'gemini-pro', name: 'Gemini Pro', description: 'Advanced reasoning' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Latest pro model' },
];

async function checkGeminiConnection(): Promise<{ connected: boolean; latency?: number; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { connected: false, error: 'No API key configured' };
  }

  try {
    const startTime = Date.now();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );
    const latency = Date.now() - startTime;

    if (response.ok) {
      return { connected: true, latency };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { 
        connected: false, 
        error: errorData.error?.message || `HTTP ${response.status}` 
      };
    }
  } catch (error: any) {
    return { connected: false, error: error.message || 'Network error' };
  }
}

export async function GET() {
  try {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    let ollamaModels: Array<{ id: string; name: string; description: string }> = [];
    
    try {
      const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        ollamaModels = data.models?.map((m: any) => ({
          id: m.name,
          name: m.name,
          description: m.details?.description || `Size: ${Math.round((m.size || 0) / 1024 / 1024)}MB`
        })) || [];
      }
    } catch (error) {
      console.log('Ollama not available:', error);
      ollamaModels = [
        { id: 'gemma2:2b', name: 'Gemma 2 2B', description: 'Default small model' },
        { id: 'llama3:8b', name: 'Llama 3 8B', description: 'Recommended medium model' },
        { id: 'mistral:7b', name: 'Mistral 7B', description: 'Fast and capable' },
        { id: 'qwen3:1.7b', name: 'Qwen3 1.7B', description: 'Good for Bengali' },
      ];
    }
    
    // Check Gemini connection status
    const geminiStatus = await checkGeminiConnection();
    
    return NextResponse.json({
      ollama: {
        models: ollamaModels,
        baseUrl: ollamaBaseUrl,
        available: ollamaModels.length > 0
      },
      gemini: {
        models: GEMINI_MODELS,
        apiKey: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
        available: !!process.env.GEMINI_API_KEY,
        connection: geminiStatus
      }
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
