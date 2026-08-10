// File upload disabled in SQLite mode
import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Upload disabled' }, { status: 501 });
}
