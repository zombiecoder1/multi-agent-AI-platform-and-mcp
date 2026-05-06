import { NextRequest, NextResponse } from 'next/server';
import { getSystemSetting, setSystemSetting } from '@/server/db/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key) {
      const setting = getSystemSetting(key);
      return NextResponse.json({ setting });
    }
    
    return NextResponse.json({ error: 'Key required' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value required' }, { status: 400 });
    }
    
    setSystemSetting(key, value);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}
