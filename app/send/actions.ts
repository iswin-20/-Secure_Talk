// app/send/actions.ts
'use server';

import { headers } from 'next/headers';
import { generateLinkLogic } from '@/lib/generate-logic';

export interface GenerateActionResult {
  url?: string;
  password?: string;
  error?: string;
}

// 新增：单独的管理员密码验证函数（轻量级，不产生费用）
export async function verifyAdminPasswordOnly(adminPassword: string): Promise<{ success: boolean; message?: string }> {
  if (!adminPassword) {
    return { success: false, message: '请输入管理员密码' };
  }
  
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return { success: false, message: '管理员密码错误' };
  }
  
  return { success: true };
}

export async function generateSecureLink(
  prevState: GenerateActionResult | undefined,
  formData: FormData,
): Promise<GenerateActionResult> {
  // 【关键修复】在Server Action开头立即验证管理员密码
  const adminPassword = formData.get('adminPassword') as string;
  if (!adminPassword) {
    return { error: '请输入管理员密码' };
  }
  
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return { error: '管理员密码错误' };
  }

  const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';
  
  //const useE2EE = formData.get('useE2EE') === 'true';

  let fileData;
  const fileUrl = formData.get('fileUrl') as string | null;
  if (fileUrl) {
    fileData = {
      url: fileUrl,
      size: parseInt(formData.get('fileSize') as string, 10),
      // E2EE 模式下，元数据是加密的
      encryptedFilename: formData.get('fileEncryptedFilename') as string | null,
      encryptedType: formData.get('fileEncryptedType') as string | null,
      // 服务端加密模式下，文件密钥需要被服务端进一步加密
      key: formData.get('fileKey') as string | null,

      // 服务端加密模式下，附加原始元数据
      filename: formData.get('originalFilename') as string | null,
      type: formData.get('originalFileType') as string | null,
    };
  }
  
  // 【关键修正】传递新的密文字段给 logic 函数
  const result = await generateLinkLogic({
    adminPassword: formData.get('adminPassword') as string,
    enable2FA: formData.get('enable2FA') === 'true',
    email: formData.get('email') as string | null,
    expiry: formData.get('expiry') as string | null,
    // 对于 E2EE，这两个是密文；对于非 E2EE，是明文
    message: formData.get('message') as string | null, 
    customPassword: formData.get('customPassword') as string | null,
    burnAfterRead: formData.get('burnAfterRead') === 'true',
    ip: ip,
    useE2EE: formData.get('useE2EE') === 'true',
    // 🔒 安全修复：移除 encryptionKey，客户端不再发送密钥
    encryptionKey: null, // 始终为 null
    // E2EE 模式下专用的密文字段
    passwordCipher: formData.get('passwordCipher') as string | null,
    messageCipher: formData.get('messageCipher') as string | null,
    fileData, // fileData 保持不变
  });

  if (result.error) {
    return { error: result.error };
  }
  
  return result.data || {};
}