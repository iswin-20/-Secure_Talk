// /api/destroy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { destroyLink, destroyChatRoom } from '@/lib/destroy-logic';

interface ErrorResult {
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { id, type = 'link', adminPassword } = await request.json(); // <-- 增加 type

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    let result;
    if (type === 'chat') {
      result = await destroyChatRoom(id);
    } else {
      result = await destroyLink(id);
    }
    
    if (result.success) {
      return NextResponse.json({ message: 'Resource destroyed successfully.' });
    } else {
      const errorResult = result as ErrorResult;
      return NextResponse.json({ error: errorResult.error || errorResult.message || 'An unknown error occurred.' }, { status: 500 });
    }
    
  } catch (e) {
    console.error('Error processing destroy request:', e);
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}