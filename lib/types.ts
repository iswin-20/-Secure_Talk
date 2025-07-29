// lib/types.ts

export interface FileMetadata {
  url: string; 
  size: number; 
  
  // E2EE 模式使用
  encryptedFilename?: string; 
  encryptedType?: string; 
  
  // 服务端加密模式使用
  filename?: string; // 原始文件名
  type?: string;     // 原始MIME type
}

export interface StoredData {
  passwordCipher: string; // 加密后的密码
  messageCipher?: string; // 加密后的附加消息
  requires2FA: boolean;
  email?: string;
  burnAfterRead?: boolean;
  file?: FileMetadata; // <-- 新增
  fileKeyCipher?: string; // <-- 新增, 用于加密文件内容的密钥
  isE2EE?: boolean; // <-- 新增这个明确的标志
}

// 新增 Chat 相关类型
export interface EncryptedMessage {
  sender: 'A' | 'B';
  timestamp: number;
  content?: string; // 这是加密后的消息内容
  file?: FileMetadata; // <-- 新增, 加密后的文件元数据
}

export interface ChatData {
  // 用于实现访问密码功能。这是用服务端密钥加密后的访问密码。
  accessPasswordCipher?: string; 
  messages: EncryptedMessage[];
  inactiveHours: number;
  ipLockingEnabled?: boolean; // 是否启用 IP 锁定
}