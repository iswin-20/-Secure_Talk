// lib/access-control.ts
'use server';

import { redis } from './redis';
import type { ChatData } from './types';

/**
 * 检查并执行 IP 锁定逻辑
 * @param chatId - The ID of the chat.
 * @param participant - 'A' or 'B'.
 * @param requestIp - The IP address of the incoming request.
 * @returns An object { success: boolean, error?: string }
 */
export async function checkIpAccess(
  chatId: string,
  participant: 'A' | 'B',
  requestIp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const chatData: ChatData | null = await redis.get(`chat:${chatId}`);

    // 如果聊天不存在或 IP 锁定未启用，则直接放行
    if (!chatData) {
      return { success: false, error: 'Chat not found or expired.' };
    }
    if (!chatData.ipLockingEnabled) {
      return { success: true }; // IP lock not enabled, so access is granted.
    }

    const ipKey = `chat_ip:${chatId}:${participant}`;
    const storedIp = await redis.get<string>(ipKey);

    if (storedIp) {
      // IP has been recorded, check for a match
      if (storedIp === requestIp) {
        return { success: true }; // IP matches, access granted.
      } else {
        return { success: false, error: `Access denied. This link is locked to a different IP address.` };
      }
    } else {
      // First visit for this participant, record their IP
      // IP 锁定的 TTL，30 天
        // 这个时间段内，IP 锁定的记录不会被删除，防止逻辑bug造成的ttl锁定消失
        //const IP_KEY_SAFEGUARD_TTL = 30 * 24 * 3600;
      // 清理工作完全交给 destroyChatRoom 函数处理。
      //await redis.set(ipKey, requestIp, { ex: IP_KEY_SAFEGUARD_TTL });
      // 但为了安全，还是直接设置成永久，即
      await redis.set(ipKey, requestIp);
      return { success: true };
    }
  } catch (error) {
    console.error('IP access check failed:', error);
    return { success: false, error: 'An internal error occurred during security check.' };
  }
}