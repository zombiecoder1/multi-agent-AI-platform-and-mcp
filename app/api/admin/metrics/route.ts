import { NextResponse } from 'next/server';
import { getAllAgentMetrics } from '@/server/db/database';

export async function GET() {
  try {
    const metrics = getAllAgentMetrics();
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
