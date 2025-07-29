// app/api/blob/upload/route.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { ratelimit } from '@/lib/rateLimit';

// 从环境变量读取共享密钥
const BLOB_SHARED_SECRET = process.env.NEXT_PUBLIC_BLOB_SHARED_SECRET;

export async function POST(request: NextRequest): Promise<NextResponse> {

  // --- 校验共享密钥 ---
  const requestSecret = request.headers.get('x-blob-secret');
  if (!BLOB_SHARED_SECRET || requestSecret !== BLOB_SHARED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---  速率限制 ---
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(`upload:${ip}`);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // 此时，我们已经确认请求是合法的，可以安全地生成令牌
        return {
          addRandomSuffix: true, 
          cacheControlMaxAge: 0, 
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Blob upload completed', blob, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}