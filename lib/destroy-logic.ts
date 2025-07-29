// lib/destroy-logic.ts
'use server';

import { del } from '@vercel/blob';
import { redis } from '@/lib/redis';
import type { StoredData, ChatData } from '@/lib/types';
import { writeLog } from './rateLimit';

/**
 * 销毁单个链接及其关联的文件
 */
export async function destroyLink(id: string): Promise<{ success: boolean; message: string }> {
  if (!id) return { success: false, message: 'ID is required' };

  try {
    const data = await redis.get<StoredData>(id);
    if (data && data.file) {
      await del(data.file.url).catch(e => console.error(`Blob del failed`, e));
    }
    await redis.del(id);
    return { success: true, message: '链接已销毁！' };
  } catch (error) {
    console.error(`Failed to destroy link ${id}:`, error);
    return { success: false, message: '销毁失败，请重试。' };
  }
}

/**
 * 销毁聊天室及其所有文件
 */
export async function destroyChatRoom(chatId: string): Promise<{ success: boolean; error?: string }> {
  if (!chatId) return { success: false, error: 'Chat ID is required.' };
  
  // 【关键修复】使用正确的前缀 "chat:"
  const redisKey = `chat:${chatId}`;
  
  try {
    // 【关键修正】redis.get() 已经返回了对象，不再需要 JSON.parse
    const chatData = await redis.get<ChatData>(redisKey);
    if (!chatData) {
        return { success: true }; 
    }
    // 删除聊天室的所有文件
    const urlsToDelete = chatData.messages?.map(msg => msg.file?.url).filter(Boolean) as string[] || [];
    if (urlsToDelete.length > 0) {
      // 【关键修复】同样，对 Blob 删除失败进行容错处理
      await del(urlsToDelete).catch(e => console.error(`Batch blob del failed for chat ${chatId}`, e));
    }
    
    // 2. 【核心修改】使用 pipeline 原子性地删除所有相关的 Redis keys
    const pipeline = redis.pipeline();

    // a. 删除主聊天数据
    pipeline.del(redisKey);
    // b. 删除关联的 IP 锁定数据，避免留下 "orphan keys"
    pipeline.del(`chat_ip:${chatId}:A`);
    pipeline.del(`chat_ip:${chatId}:B`);

    // 执行所有删除命令
    await pipeline.exec();

    // 可选：记录审计日志
    await writeLog('chat:destroy', chatId, { action: 'CHAT_DESTROYED_FULLY' }).catch(e => console.error('Failed to write destroy log:', e));

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to destroy chat ${chatId}:`, errorMessage);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}