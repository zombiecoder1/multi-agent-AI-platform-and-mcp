import { NextRequest, NextResponse } from 'next/server';
import { getConversationsBySession, getMessagesByConversation, getSessionStats } from '@/server/db/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const conversationId = searchParams.get('conversationId');
    
    if (conversationId) {
      const messages = getMessagesByConversation(conversationId);
      return NextResponse.json({ messages });
    }
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    const conversations = getConversationsBySession(sessionId);
    const stats = getSessionStats(sessionId);
    
    return NextResponse.json({ conversations, stats });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
