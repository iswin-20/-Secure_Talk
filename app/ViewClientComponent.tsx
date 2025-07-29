// app/ViewClientComponent.tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
// 导入新的 Server Actions
import { destroyLinkAction, sendVerificationEmailAction } from './actions';
import type {FileMetadata } from '@/lib/types';
import { decryptFile, decryptMessage } from '@/lib/chat-crypto';

// --- 新增文件显示组件 (可以移到单独文件) ---
function FileViewer({ fileMeta, decryptionKey }: { fileMeta: FileMetadata; decryptionKey: string }) {
  const [decryptedFilename, setDecryptedFilename] = useState('Loading...');
  const [decryptedType, setDecryptedType] = useState('');
  const [decryptedObjectUrl, setDecryptedObjectUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState('');

    // 【关键修复】区分 E2EE 和服务端加密模式
    useEffect(() => {
      // E2EE 模式: 解密元数据
      if (fileMeta.encryptedFilename && fileMeta.encryptedType) {
          Promise.all([
              decryptMessage(decryptionKey, fileMeta.encryptedFilename),
              decryptMessage(decryptionKey, fileMeta.encryptedType),
          ]).then(([name, type]) => {
              setDecryptedFilename(name);
              setDecryptedType(type);
          }).catch(() => {
              setError('无法解密文件元数据。');
              setDecryptedFilename('解密失败');
          });
      } 
      // 服务端模式: 直接使用原始元数据
      else if (fileMeta.filename && fileMeta.type) {
          setDecryptedFilename(fileMeta.filename);
          setDecryptedType(fileMeta.type);
      }
      // 回退
      else {
          setDecryptedFilename('Encrypted File');
          setDecryptedType('application/octet-stream');
      }
    }, [decryptionKey, fileMeta]);

    const handleDownloadAndDecrypt = async () => {
      if (!decryptionKey || isDecrypting) return;
      setIsDecrypting(true);
      setError('');
      try {
        const res = await fetch(fileMeta.url);
        // 【修正】解密密钥现在对两种模式都适用
        // E2EE: decryptionKey 是 #hash
        // Server-side: decryptionKey 是从服务端解密后传来的 fileKey
        const decryptedBuffer = await decryptFile(decryptionKey, await res.blob());
        const objectUrl = URL.createObjectURL(new Blob([decryptedBuffer], { type: decryptedType }));
        setDecryptedObjectUrl(objectUrl);
      } catch (err) {
        console.error('File decryption error:', err);
        setError('Decryption failed.');
      } finally {
        setIsDecrypting(false);
      }
    };
    
    if (!decryptionKey) return <div className="text-red-500 dark:text-red-400 text-sm">{error}</div>;

    const isImage = decryptedType.startsWith('image/');

    return (
        <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">附加文件:</h3>
            {decryptedObjectUrl ? (
                 isImage ? (
                    <img src={decryptedObjectUrl} alt={decryptedFilename} className="mt-2 max-w-full h-auto rounded-md shadow-md" />
                  ) : (
                    <a href={decryptedObjectUrl} download={decryptedFilename} className="mt-2 block w-full text-center px-4 py-2 font-bold text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 rounded-md transition-colors">
                      下载: {decryptedFilename}
                    </a>
                  )
            ) : (
                <div className="mt-2">
                    <p className="font-mono bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded break-all">{decryptedFilename}</p>
                    <button onClick={handleDownloadAndDecrypt} disabled={isDecrypting} className="mt-2 w-full px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 rounded-md disabled:bg-indigo-300 dark:disabled:bg-indigo-500 transition-colors">
                        {isDecrypting ? '正在解密...' : (isImage ? '查看图片' : '下载文件')}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</p>}
                </div>
            )}
        </div>
    );
}

interface Props {
  id?: string;
  initialPassword?: string;
  message?: string;
  requires2FA?: boolean;
  isFinal?: boolean;
  burnAfterRead?: boolean;
  file?: FileMetadata; // <-- 新增
  passwordCipher?: string;
  messageCipher?: string;
  decryptedFileKey?: string;
}


export default function ViewClientComponent({
  id,
  initialPassword,
  message,
  requires2FA,
  isFinal,
  burnAfterRead,
  file,
  passwordCipher,
  messageCipher,
  decryptedFileKey,
}: Props) {
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isPending, startTransition] = useTransition();
  
  // --- 统一的状态管理 ---
  const [password, setPassword] = useState(initialPassword || '');
  const [displayMessage, setDisplayMessage] = useState(message || '');
  const [fileKey, setFileKey] = useState<string | null>(decryptedFileKey || null);

  useEffect(() => {
    // 仅当没有服务端预解密的密码时，才尝试 E2EE 解密
    if (!initialPassword) {
      const hashKey = window.location.hash.substring(1);
      if (hashKey) {
        setFileKey(hashKey); // 在 E2EE 模式下，文件和内容用同一个密钥

        // 开始解密
        const decryptAll = async () => {
          if (passwordCipher) {
            try {
              const p = await decryptMessage(hashKey, passwordCipher);
              setPassword(p);
            } catch {
              setPassword(''); // 解密失败则清空
              setFeedback('密码解密失败。');
            }
          }
          if (messageCipher) {
            try {
              const m = await decryptMessage(hashKey, messageCipher);
              setDisplayMessage(m);
            } catch {
              setDisplayMessage('消息解密失败。');
            }
          }
        };
        decryptAll();
      } else if(passwordCipher) {
        // 有密文但没密钥
        setFeedback('链接缺少解密密钥 (#hash)。');
      }
    }
  }, [initialPassword, passwordCipher, messageCipher]);

  // 【新增】一个只处理复制逻辑的函数
  const handleCopyOnly = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setFeedback('密码已复制到剪贴板！');
    } catch {
      setFeedback('自动复制失败，请手动复制。');
    }
  };
  const handleCopyAndDestroy = async () => {
    if (!password || !id) return;
    try {
      await navigator.clipboard.writeText(password);
      setFeedback('已复制到剪贴板！正在销毁链接...');
      
      startTransition(async () => {
        const result = await destroyLinkAction(id);
        if (result.success) {
          setIsDestroyed(true);
        }
        setFeedback(result.message);
      });

    } catch {
      setFeedback('复制到剪贴板失败。');
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!id) return;
    startTransition(async () => {
        setFeedback('发送中...');
        const result = await sendVerificationEmailAction(id);
        setFeedback(result.message);
    });
  };

  if (isDestroyed) {
    return <div className="text-center p-8 text-xl font-bold text-green-600 dark:text-green-400">链接已成功销毁！</div>;
  }
  
  return (
      <div className="w-full max-w-lg p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center transition-colors duration-300">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">安全信息</h1>
        {displayMessage && <p className="text-gray-600 dark:text-gray-400 italic">{displayMessage}</p>}
        <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-md transition-colors duration-300">
          {requires2FA && !password ? (
            <div className="space-y-4">
              <p className="text-gray-900 dark:text-gray-100">此信息需要通过邮件进行二次验证。</p>
              <button onClick={handleSendVerificationEmail} disabled={isPending} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 rounded-md disabled:bg-indigo-300 dark:disabled:bg-indigo-500 transition-colors">
                {isPending ? '处理中...' : '发送验证邮件'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">密码:</p>
              <pre className="px-4 py-3 text-2xl font-mono text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900 rounded-md break-all transition-colors duration-300">{password}</pre>
              {!isFinal && (
                <>
                  <button onClick={handleCopyOnly} className="w-full px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-md transition-colors">
                    复制密码
                  </button>
                  <button onClick={handleCopyAndDestroy} disabled={isPending} className="w-full px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-md disabled:bg-red-300 dark:disabled:bg-red-500 transition-colors">
                    {isPending ? '销毁中...' : '复制并销毁'}
                  </button>
                </>
              )}
              {burnAfterRead && (
                <>
                  <button onClick={handleCopyOnly} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    复制密码
                  </button>
                  <p className="text-sm text-gray-500">此链接被设置为阅后即焚，已被销毁。</p>
                </>
              )}
            </div>
          )}
        </div>
        {file && fileKey && (
          <FileViewer fileMeta={file} decryptionKey={fileKey} />
        )}

        {feedback && <p className="mt-4 text-sm text-gray-700">{feedback}</p>}
      </div>
  );
}