import { NextRequest, NextResponse } from 'next/server';
import { getPersonaOverride, getAllPersonaOverrides, savePersonaOverride, deletePersonaOverride } from '@/server/db/database';
import { agentRegistry } from '@/server/agents/registry';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    if (agentId) {
      const override = getPersonaOverride(agentId);
      const agent = agentRegistry.find(a => a.id === agentId);
      
      return NextResponse.json({
        agentId,
        override: override || null,
        registryRole: agent?.role || null,
        effectiveRole: override?.role || agent?.role || null
      });
    }
    
    const overrides = getAllPersonaOverrides();
    return NextResponse.json({ 
      overrides,
      registry: agentRegistry.map(a => ({ id: a.id, name: a.name, role: a.role }))
    });
  } catch (error) {
    console.error('Error fetching persona:', error);
    return NextResponse.json({ error: 'Failed to fetch persona' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, role } = body;
    
    if (!agentId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    savePersonaOverride(agentId, role);
    return NextResponse.json({ success: true, agentId });
  } catch (error) {
    console.error('Error saving persona:', error);
    return NextResponse.json({ error: 'Failed to save persona' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }
    
    deletePersonaOverride(agentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    return NextResponse.json({ error: 'Failed to delete persona' }, { status: 500 });
  }
}
