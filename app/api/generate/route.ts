// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateLinkLogic } from '@/lib/generate-logic';
import { createChatRoomLogic } from '@/lib/chat-logic'; // <-- 新增

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.ip ?? '127.0.0.1';
    
    // --- 授权检查 ---
    if (body.adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const type = body.type || 'link'; // 默认为创建链接

    if (type === 'chat') {
      // 安全问题：API 不应该生成加密密钥，应该由客户端提供
      if (!body.encryptionKey) {
        return NextResponse.json({ 
          error: 'encryptionKey is required for chat creation' 
        }, { status: 400 });
      }
      
      const result = await createChatRoomLogic(body.encryptionKey, body.expiryHours);
      return NextResponse.json(result, { status: 200 });
    }

    if (type === 'link') {
      // API 创建链接强制使用服务端加密模式
      const result = await generateLinkLogic({ ...body, ip, useE2EE: false });

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json(result.data, { status: result.status });
    }

    return NextResponse.json({ error: 'Invalid type specified.' }, { status: 400 });

  } catch (e) {
    console.error('Error processing request:', e);
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
}


//通过 API 上传文件是一个复杂的话题（需要处理 multipart/form-data），当前 API 仅支持创建无文件的链接和聊天室。