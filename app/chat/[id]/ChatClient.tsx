// app/chat/[id]/ChatClient.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { getChatHistory, postMessage, destroyChat } from '../actions';
import { encryptMessage, decryptMessage, encryptFile } from '@/lib/chat-crypto';
import type { EncryptedMessage, FileMetadata } from '@/lib/types';
import { upload } from '@vercel/blob/client'; // <-- 新增
import FileMessage from './FileMessage'; // <-- 新增

// 读取环境变量
const isUploadEnabled = process.env.NEXT_PUBLIC_UPLOAD_ENABLE === 'true';
const maxUploadSizeMB = parseInt(process.env.NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB || '25', 10);
const maxUploadSizeBytes = maxUploadSizeMB * 1024 * 1024;
const blobSharedSecret = process.env.NEXT_PUBLIC_BLOB_SHARED_SECRET; // <-- 获取密钥

interface ChatClientProps {
  chatId: string;
  myIdentity: 'A' | 'B';
  requiredAccessPassword?: string;
}

export default function ChatClient({ chatId, myIdentity, requiredAccessPassword }: ChatClientProps) {
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!requiredAccessPassword);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedContent, setDecryptedContent] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState('');
  
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);

  // message scroll fix
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // <-- 新增进度条状态
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- 新增 state ---
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 从 URL hash 获取加密密钥
  useEffect(() => {
    const key = window.location.hash.substring(1);
    if (key) {
      setAccessKey(key);
    } else {
      setError('未在URL中找到加密密钥。聊天无法访问。Encryption key not found in URL. The chat is inaccessible.');
    }
  }, []);

  // 2. 解密消息
  useEffect(() => {
    if (!accessKey || messages.length === 0) return;

    const decryptAll = async () => {
      const newDecryptedContent: Record<string, string> = {};
      for (const msg of messages) {
        if (msg.content && !decryptedContent[msg.timestamp]) {
          try {
            // 现在 msg.content 可以安全地传递，因为我们已经检查过它不是 undefined
            const plainText = await decryptMessage(accessKey, msg.content);
            newDecryptedContent[msg.timestamp] = plainText;
          } catch {
            newDecryptedContent[msg.timestamp] = '无法解密消息。Failed to decrypt message.';
          }
        }
      }
      // 只有在有新内容时才更新 state，避免不必要的重渲染
      if (Object.keys(newDecryptedContent).length > 0) {
        setDecryptedContent(prev => ({ ...prev, ...newDecryptedContent }));
      }
    };

    decryptAll();
  }, [messages, accessKey, decryptedContent]);

  // 3. 获取历史消息 (轮询)
  /* 服务器压力有点大，暂时注释掉
  useEffect(() => {
    if (!isAuthenticated || !accessKey) return;
    
    const fetchHistory = async () => {
      const result = await getChatHistory(chatId);
      if (result.messages) {
        setMessages(result.messages);
      } else if (result.error) {
        setError(result.error);
        // 如果聊天不存在，停止轮询
        if (result.error.includes('not found')) {
            clearInterval(intervalId);
        }
      }
    };

    fetchHistory(); // 立即获取一次
    const intervalId = setInterval(fetchHistory, 5000); // 每5秒轮询一次

    return () => clearInterval(intervalId);
  }, [isAuthenticated, accessKey, chatId]);
  */

  // 创建一个可重用的 fetchHistory 函数
    const fetchHistory = async () => {
        if (!isAuthenticated || !accessKey) return;
        setIsFetching(true); // <--- 设置为 true
        setError('');
        
        try {
        const result = await getChatHistory(chatId);
        if (result.messages) {
            setMessages(result.messages);
        } else if (result.error) {
            setError(result.error);
        }
        } catch (e) {
        console.error('Fetch history error:', e);
        setError('An unexpected error occurred while fetching history.');
        } finally {
        setIsFetching(false); // <--- 无论成功或失败，都设置为 false
        }
    };

    // 在页面加载时获取一次历史记录
    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, accessKey, chatId]);

    // 4. 滚动到底部
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // 判断用户是否接近底部 (阈值为 100px)
      // 只有当用户本身就在底部时，新消息才触发滚动
      const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 100;

      if (isScrolledToBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, decryptedContent]); // 依赖项保持不变，因为解密也可能改变内容高度

    const handleAuth = () => {
      if (passwordInput === requiredAccessPassword) {
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError('密码错误');
      }
    };

    // --- 新增文件上传处理函数 ---
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleSendFile(file);
    }
    // 重置 input，以便可以再次选择相同的文件
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleSendFile = async (file: File) => {
    if (!accessKey || isUploading) return;
    
    // 文件大小限制 (例如 100MB)
    if (file.size > maxUploadSizeBytes) {
      setError(`文件过大 (最大 ${maxUploadSizeMB}MB).`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0); // <-- 重置进度
    setError('');

    try {
      // 1. 加密文件本身
      const encryptedFileBlob = await encryptFile(accessKey, file);

      // 2. 将加密后的文件上传到 Vercel Blob
      const newBlob = await upload(file.name, encryptedFileBlob, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
        onUploadProgress: (progress) => { setUploadProgress(progress.percentage); },
        // --- 新增: 发送共享密钥 ---
        //clientPayload: null, // 确保有这个字段
        headers: {
          'x-blob-secret': blobSharedSecret || '',
        },
      });
      
      // 3. 加密文件元数据
      const encryptedFilename = await encryptMessage(accessKey, file.name);
      const encryptedType = await encryptMessage(accessKey, file.type);

      // 4. 构建消息体
      const fileMeta: FileMetadata = {
        url: newBlob.url,
        encryptedFilename,
        encryptedType,
        size: file.size,
      };

      const message: EncryptedMessage = {
        sender: myIdentity,
        timestamp: Date.now(),
        file: fileMeta, // 使用 file 字段
      };

      // 5. 发送消息
      const result = await postMessage(chatId, message);
      if (result.success) {
        setMessages(prev => [...prev, message]);
      } else {
        setError(result.error || 'File message failed to send.');
      }

    } catch (e) {
      console.error('Send file error:', e);
      setError('An error occurred during file upload or encryption.');
    } finally {
      setIsUploading(false);
    }
  };

    //  更新 handleSendMessage 函数
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !accessKey || isSending) return;

        setIsSending(true); // <--- 设置为 true
        setError('');

        try {
        const encryptedContent = await encryptMessage(accessKey, newMessage);
        const message: EncryptedMessage = {
            sender: myIdentity,
            timestamp: Date.now(),
            content: encryptedContent,
        };
        
        const result = await postMessage(chatId, message);
        if (result.success) {
            setNewMessage('');
            // 乐观更新：立即将新消息添加到 state，无需等待下一次 fetch
            setMessages(prev => [...prev, message]); 
        } else {
            setError(result.error || '消息发送失败');
        }
        } catch (e) {
        console.error('Send message error:', e);
        setError('Encryption failed.');
        } finally {
        setIsSending(false); // <--- 无论成功或失败，都设置为 false
        }
    };


    // 更新 handleDestroyChat 函数
    const handleDestroyChat = async () => {
        if (confirm('Are you sure you want to permanently destroy this entire chat? This cannot be undone.')) {
        setIsDestroying(true); // <--- 设置为 true
        setError('');
        try {
            const result = await destroyChat(chatId);
            if (!result.success) {
            setError(result.error || '销毁失败，请重试');
            } else {
            setIsDestroyed(true);
            } // <--- 设置为 true，表示聊天已被销毁
        } catch (e) {
            console.error('Destroy chat error:', e);
            setError('An unexpected error occurred while destroying chat.');
            setIsDestroying(false); // 只有在销毁失败时才设置回 false
        }
        }
    }

    // 辅助函数：格式化时间戳
    const formatTimestamp = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };



  if (!accessKey) {
    return <div className="text-center p-8 text-red-500 text-xl">{error}</div>;
  }
  
  if (isDestroyed) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center p-8 transition-colors duration-300">
        <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">聊天已销毁</h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">此聊天会话已被永久删除。</p>
      </div>
    );
  }


  if (error.includes('not found')) {
      return <div className="text-center p-8 text-xl font-bold text-red-600 dark:text-red-400">This chat has been destroyed or has expired.</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-sm p-8 space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl transition-colors duration-300">
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100">Access Required</h2>
        <p className="text-center text-gray-500 dark:text-gray-400">This chat is protected by an access password.</p>
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          placeholder="Enter access password"
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-colors"
        />
        <button onClick={handleAuth} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 rounded-md transition-colors">
          Unlock
        </button>
        {authError && <p className="text-red-500 dark:text-red-400 text-center">{authError}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-2xl h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl transition-colors duration-300">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">安全聊天</h1>
            <div className="flex items-center space-x-2">
            {/* 新增的刷新按钮 */}
            <button onClick={fetchHistory} disabled={isFetching} className="px-3 py-1 text-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 rounded disabled:bg-green-300 dark:disabled:bg-green-500 transition-colors">
                {isFetching ? '刷新中...' : '刷新'}
            </button>
            <button onClick={handleDestroyChat} disabled={isDestroying} className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded disabled:bg-red-300 dark:disabled:bg-red-500 transition-colors">
                {isDestroying ? '销毁中...' : '销毁聊天'}
            </button>
            </div>
        </div>
        {/* 【修改点 3】: 将 ref 应用到滚动容器上 */}
        <div ref={scrollContainerRef} className="flex-1 p-4 overflow-y-auto">
            {messages.map((msg) => (
                <div key={msg.timestamp} className={`flex items-end ${msg.sender === myIdentity ? 'justify-end' : 'justify-start'} mb-2`}>
                    {msg.sender !== myIdentity && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mr-2 mb-1">
                            {formatTimestamp(msg.timestamp)}
                        </div>
                    )}
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg transition-colors ${msg.sender === myIdentity ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-gray-100'}`}>
                        {msg.content && (decryptedContent[msg.timestamp] || 'Decrypting...')}
                        {msg.file && accessKey && <FileMessage fileMeta={msg.file} accessKey={accessKey} />}
                    </div>
                    {msg.sender === myIdentity && (
                         <div className="text-xs text-gray-400 dark:text-gray-500 ml-2 mb-1">
                            {formatTimestamp(msg.timestamp)}
                        </div>
                    )}
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {error && <p className="text-red-500 dark:text-red-400 mb-2 text-sm">{error}</p>}
            {isUploading && (
              <div className="mb-2">
                <p className="text-sm text-blue-600 dark:text-blue-400">正在上传: {uploadProgress}%</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-colors"
                    disabled={isSending || isUploading}
                />
                {/* --- 新增文件上传按钮 --- */}
                {/* --- 修改: 条件渲染上传按钮 --- */}
                {isUploadEnabled && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isUploading || isSending}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isSending}
                      className="p-2 h-10 w-10 flex-shrink-0 flex items-center justify-center font-bold text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 rounded-md disabled:bg-gray-300 dark:disabled:bg-gray-500 transition-colors"
                      title="发送文件"
                    >
                      📎
                    </button>
                  </>
                )}
                <button onClick={handleSendMessage} disabled={isSending || isUploading || !newMessage.trim()} className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 rounded-md disabled:bg-indigo-300 dark:disabled:bg-indigo-500 transition-colors">
                  {isSending ? '发送中...' : '发送'}
                </button>
            </div>
        </div>
    </div>
  );
}