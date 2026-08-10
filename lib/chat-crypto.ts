// lib/chat-crypto.ts
"use client";

/**
 * 将 CryptoKey 导出为可在 URL hash 中使用的 Base64 字符串。
 */
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * 从 URL hash 中的 Base64 字符串导入 CryptoKey。
 */
async function importKey(keyStr: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(atob(keyStr).split('').map(c => c.charCodeAt(0)));
  return window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * 生成一个新的 AES-GCM 密钥并将其导出为 Base64 字符串。
 */
export async function generateKey(): Promise<string> {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return exportKey(key);
}

/**
 * Chunked base64 encode to avoid stack overflow on large buffers
 */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Uint8Array(bytes.buffer);
}

/**
 * 使用给定的 Base64 密钥加密一条消息。
 * @param keyStr Base64 编码的密钥
 * @param data 要加密的字符串数据
 * @returns 加密后的 Base64 字符串 (iv:ciphertext)
 */
export async function encryptMessage(keyStr: string, data: string): Promise<string> {
  const key = await importKey(keyStr);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  const ivB64 = uint8ToBase64(iv);
  const ciphertextB64 = uint8ToBase64(new Uint8Array(ciphertext));
  
  return `${ivB64}:${ciphertextB64}`;
}

/**
 * 使用给定的 Base64 密钥解密一条消息。
 * @param keyStr Base64 编码的密钥
 * @param encryptedData 加密的 Base64 字符串 (iv:ciphertext)
 * @returns 解密后的原始字符串
 */
export async function decryptMessage(keyStr: string, encryptedData: string): Promise<string> {
  const key = await importKey(keyStr);
  const [ivB64, ciphertextB64] = encryptedData.split(':');

  if (!ivB64 || !ciphertextB64) {
    throw new Error('Invalid encrypted data format');
  }

  const ivBytes = base64ToUint8(ivB64);
  const ciphertextBytes = base64ToUint8(ciphertextB64);

  // Re-wrap as fresh Uint8Array to satisfy strict TS BufferSource typing
  const iv = new Uint8Array(ivBytes);
  const ciphertext = new Uint8Array(ciphertextBytes);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decrypted = await (window.crypto.subtle as any).decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * 使用给定的 Base64 密钥加密一个 File 对象。
 * @param keyStr Base64 编码的密钥
 * @param file 要加密的文件
 * @returns 加密后的 Blob 对象
 */
export async function encryptFile(keyStr: string, file: File): Promise<Blob> {
  const key = await importKey(keyStr);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  );

  // 将 iv 和 ciphertext 合并成一个 Blob
  return new Blob([iv, ciphertext]);
}

/**
 * 使用给定的 Base64 密钥解密一个 Blob 对象。
 * @param keyStr Base64 编码的密钥
 * @param encryptedBlob 加密的 Blob (iv + ciphertext)
 * @returns 解密后的 ArrayBuffer
 */
export async function decryptFile(keyStr: string, encryptedBlob: Blob): Promise<ArrayBuffer> {
  const key = await importKey(keyStr);
  const encryptedBuffer = await encryptedBlob.arrayBuffer();

  // 从 Blob 中分离 iv 和 ciphertext
  const iv = encryptedBuffer.slice(0, 12);
  const ciphertext = encryptedBuffer.slice(12);

  if (iv.byteLength !== 12) {
    throw new Error('Invalid encrypted data: IV is missing or has incorrect length.');
  }

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return decrypted;
}