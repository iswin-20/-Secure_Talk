// lib/rateLimit.ts — disabled in SQLite mode
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';

export const ENABLE_RATE_LIMIT = false;
export const ENABLE_AUDIT_LOG = false;

export async function writeLog(key: string, linkId: string | null, data: Record<string, string>) {
  // no-op
}

export async function ipRateLimit(ip: string): Promise<NextResponse | null> {
  return null; // always allow
}
