// Cleanup disabled in SQLite mode
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ success: true, message: 'Cleanup not required in SQLite mode.' });
}

export async function GET() {
  return NextResponse.json({ message: 'Cleanup not required in SQLite mode.' });
}
