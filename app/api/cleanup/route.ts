// app/api/cleanup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { del as deleteFromBlob, list as listFromBlob } from '@vercel/blob';

// 辅助函数保持不变
async function scanAndCollectKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = 0;
  do {
    const [nextCursor, foundKeys] = await redis.scan(cursor, { match: pattern, count: 500 });
    cursor = Number(nextCursor);
    keys.push(...foundKeys);
  } while (cursor !== 0);
  return keys;
}

export async function POST(req: NextRequest) {
  const { adminPassword, tasks = [], dryRun = false } = await req.json();
  
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ success: false, message: 'No tasks specified. Provide an array of tasks: ["ips", "logs", "files"].' }, { status: 400 });
  }

  const report: {
      dryRun: boolean;
      tasksRequested: string[];
      results: Record<string, unknown>;
  } = {
      dryRun,
      tasksRequested: tasks,
      results: {}
  };

  try {
    // --- 任务: 清理孤儿 IP 键 (优化版) ---
    if (tasks.includes('ips')) {
        const result = { scanned: 0, to_delete: 0, deleted: 0 };
        const ipKeys = await scanAndCollectKeys('chat_ip:*');
        result.scanned = ipKeys.length;
        
        const keysToDelete: string[] = [];

        if (ipKeys.length > 0) {
            // 使用Pipeline批量执行EXISTS命令，减少网络往返
            const pipeline = redis.pipeline();
            const chatKeysToCheck = ipKeys.map(ipKey => `chat:${ipKey.split(':')[1]}`);
            chatKeysToCheck.forEach(chatKey => pipeline.exists(chatKey));
            const existenceResults = await pipeline.exec(); // 返回一个数组，如 [[null, 1], [null, 0]]

            existenceResults.forEach((res, index) => {
                const exists = (res as [unknown, number])[1] === 1; // [1] 是命令的返回值
                if (!exists) {
                    keysToDelete.push(ipKeys[index]);
                }
            });
        }
        
        result.to_delete = keysToDelete.length;
        if (!dryRun && keysToDelete.length > 0) {
            result.deleted = await redis.del(...keysToDelete);
        }
        report.results.ips = result;
    }

    // --- 任务: 清理日志 (保持原样，已足够高效) ---
    if (tasks.includes('logs')) {
        const result = { scanned: 0, deleted: 0 };
        const logKeys = await scanAndCollectKeys('log:*');
        result.scanned = logKeys.length;

        if (!dryRun && logKeys.length > 0) {
            result.deleted = await redis.del(...logKeys);
        }
        report.results.logs = result;
    }

    // --- 任务: 清理孤儿文件 (优化版) ---
    if (tasks.includes('files')) {
      const result = { blobs_scanned: 0, redis_keys_scanned: 0, redis_values_checked: 0, to_delete: 0, deleted: 0, errors: 0 };
      
      // 1. 获取 Vercel Blob中的所有文件URL
      const { blobs } = await listFromBlob();
      result.blobs_scanned = blobs.length;

      // 2. 找出所有在Redis中记录的文件URL
      // 扫描'chat:*'前缀的键
      const chatKeys = await scanAndCollectKeys('chat:*');
      // 扫描所有长度为5的键，来捕获nanoid生成的阅后即焚键
      const nanoidKeys = await scanAndCollectKeys('?????'); 

      // 使用Set来自动去重，以防有5位字符的chat ID
      const keysToCheck = [...new Set([...chatKeys, ...nanoidKeys])];
      result.redis_keys_scanned = keysToCheck.length;

      const allFileUrlsInRedis = new Set<string>();

      if (keysToCheck.length > 0) {
          // 批量获取所有可能包含文件URL的键的值
          // 注意：如果keysToCheck数量巨大(几十万以上)，考虑分批MGET
          const values = await redis.mget(keysToCheck);
          result.redis_values_checked = values.length;

          values.forEach((value) => {
              if (!value) return;
              try {
                  const data = JSON.parse(value as string);
                  
                  // 检查是否是阅后即焚链接的结构
                  if (data?.file?.url) {
                      allFileUrlsInRedis.add(data.file.url);
                  }
                  // 检查是否是聊天记录的结构
                  else if (data?.messages && Array.isArray(data.messages)) { 
                      data.messages.forEach((msg: { file?: { url?: string } }) => {
                          if (msg.file?.url) allFileUrlsInRedis.add(msg.file.url);
                      });
                  }
              } catch {
                  // 有些键（比如一个合法的5位nanoid键）的值可能不是JSON，解析会失败，这是正常的，忽略即可
              }
          });
      }
      
      // 3. 找出差集
      const urlsToDelete = blobs.filter(blob => !allFileUrlsInRedis.has(blob.url)).map(b => b.url);
      result.to_delete = urlsToDelete.length;

      // 4. 执行删除
      if (!dryRun && urlsToDelete.length > 0) {
          try {
              await deleteFromBlob(urlsToDelete);
              result.deleted = urlsToDelete.length;
          } catch(e) {
              console.error("Blob deletion error:", e);
              result.errors++;
          }
      }
      report.results.files = result;
    }

    return NextResponse.json({ success: true, message: 'Cleanup process finished.', report });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Cleanup API failed:', error);
    return NextResponse.json({ success: false, message: 'Cleanup failed due to a server error.', error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({
        message: "Cleanup API. Use POST with adminPassword, tasks array, and optional dryRun flag.",
        example_request: {
            adminPassword: "your_password",
            tasks: ["ips", "logs", "files"],
            dryRun: true
        }
    });
}