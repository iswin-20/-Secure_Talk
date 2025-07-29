// lib/generate-logic.ts
import { redis } from '@/lib/redis';
import { encrypt } from '@/lib/crypto'; // 导入服务端加解密
import { nanoid } from 'nanoid';
import { writeLog } from '@/lib/rateLimit';
import type { StoredData } from '@/lib/types';

interface GenerateParams {
    adminPassword?: string | null;
    enable2FA?: boolean;
    email?: string | null;
    expiry?: string | null;
    message?: string | null;
    customPassword?: string | null;
    burnAfterRead?: boolean;
    ip: string;
    useE2EE: boolean;
    encryptionKey: string | null; // E2EE 主密钥
    // 新增 E2EE 专用密文字段
    passwordCipher?: string | null;
    messageCipher?: string | null;
    fileData?: {
        url: string;
        size: number;
        encryptedFilename: string | null; // E2EE
        encryptedType: string | null;     // E2EE
        key: string | null;               // Server-side
        filename?: string | null; // <-- 解决TS报错
        type?: string | null;     // <-- 解决TS报错
    };
}

export async function generateLinkLogic(params: GenerateParams) {
    const { adminPassword, enable2FA, email, expiry, message, customPassword, burnAfterRead, ip, useE2EE, fileData, passwordCipher, messageCipher } = params;

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return { error: 'Unauthorized', status: 401 };
    }
    
    // --- 密码生成逻辑 (不变) ---
    let finalPassword = customPassword;
    let passwordWasGenerated = false;
    if (!finalPassword && !useE2EE) { // 【修正】E2EE 模式下，如果用户没提供密码，我们就不处理密码
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        finalPassword = '';
        for (let i = 0; i < 16; i++) {
            finalPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        passwordWasGenerated = true;
    }

    const id = nanoid(5);
    const dataToStore: StoredData = {
        passwordCipher: '', // 将被覆盖
        requires2FA: !!enable2FA,
        burnAfterRead: !!burnAfterRead,
        isE2EE: useE2EE, // <-- 在这里设置标志
    };

    if (useE2EE) {
        // --- E2EE 模式 ---
        // 🔒 安全修复：服务端不再处理密钥，只存储客户端传来的密文
        // 服务端只存储加密后的数据，无法解密
        if (passwordCipher) dataToStore.passwordCipher = passwordCipher;
        if (messageCipher) dataToStore.messageCipher = messageCipher;
        
        if (fileData) {
            dataToStore.file = {
                url: fileData.url,
                encryptedFilename: fileData.encryptedFilename!,
                encryptedType: fileData.encryptedType!,
                size: fileData.size,
                 // 【关键修复】存储原始文件名和类型
                filename: fileData.filename || 'unknown_file',
                type: fileData.type || 'application/octet-stream',
            };
        }
    } else {
        // --- 服务端加密模式 ---
        // 使用 ENCRYPTION_SEED 加密
        if (finalPassword) dataToStore.passwordCipher = encrypt(finalPassword);
        if (message) dataToStore.messageCipher = encrypt(message);
        if (fileData?.key) { // 文件密钥也需要被服务端加密后存储
            dataToStore.fileKeyCipher = encrypt(fileData.key);
            // 这里我们不需要存储加密后的文件名/类型，因为密钥在服务端
            // 我们可以在查看时即时生成它们（如果需要），或干脆不存
            dataToStore.file = {
                url: fileData.url,
                size: fileData.size,
                // 【关键修正】在这里存储原始文件名和类型
                filename: fileData.filename || 'unknown_file',
                type: fileData.type || 'application/octet-stream',
            };
        }
    }

    if (enable2FA && email) dataToStore.email = email;

    const expiryInSeconds = expiry ? parseInt(expiry, 10) * 3600 : 3 * 24 * 3600;
    await redis.set(id, JSON.stringify(dataToStore), { ex: expiryInSeconds });

    await writeLog(`generate:${ip}`, id, { /* ... */ });

    // 🔒 安全修复：E2EE 模式下服务端不处理密钥
    const generatedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/?v=${id}`;
    // E2EE 模式下，客户端会自己追加 hash

    // 【关键修正】E2EE 模式下，不返回密码
    const responsePayload: { url: string; password?: string } = { url: generatedUrl };
    if (passwordWasGenerated && !useE2EE && finalPassword) {
      responsePayload.password = finalPassword;
    }

    return { data: responsePayload, status: 200 };
}