// app/send/page.tsx
'use client';

import { useFormStatus } from 'react-dom';
import { generateSecureLink, verifyAdminPasswordOnly, GenerateActionResult } from './actions'; // 导入新的 Server Action
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { nanoid } from 'nanoid';

// --- 新增: 导入客户端加密和 Blob 上传 ---
import { generateKey, encryptFile, encryptMessage } from '@/lib/chat-crypto';
import { upload } from '@vercel/blob/client';
//import type { FileMetadata } from '@/lib/types';

// --- 新增: 读取环境变量 ---
const isUploadEnabled = process.env.NEXT_PUBLIC_UPLOAD_ENABLE === 'true';
const maxUploadSizeMB = parseInt(process.env.NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB || '25', 10);
const maxUploadSizeBytes = maxUploadSizeMB * 1024 * 1024;
const blobSharedSecret = process.env.NEXT_PUBLIC_BLOB_SHARED_SECRET; // <-- 获取密钥
const isResendConfigured = process.env.NEXT_PUBLIC_2FA_ENABLE === 'true'; // 检查是否启用二次验证

// 一个小的子组件来处理提交按钮的禁用状态
function SubmitButton({ isProcessing }: { isProcessing: boolean }) {
  // useFormStatus 必须在 <form> 组件内部使用
  // 但因为我们用了 useFormState，其 isPending 状态可以从 useTransition 获得，或者直接在父组件中管理
  // 这里为了简单，我们用一个外部 state
  const { pending } = useFormStatus();
  //const isDisabled = pending || isProcessing;
  
  let text = '生成链接';
  if (isProcessing) text = '正在处理...';
  if (pending) text = '正在生成...';
  return (
    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-md disabled:bg-blue-300 dark:disabled:bg-blue-500 transition-colors">
      {text}
    </button>
  );
}


export default function SendPage() {
  const [enable2FA, setEnable2FA] = useState(false);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  
  // 直接管理结果状态，不使用 useFormState
  const [result, setResult] = useState<GenerateActionResult | null>(null);
  // 方便地重置表单
  const [_formKey, setFormKey] = useState(Date.now());

  // --- 新增: 文件和上传状态 ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // 通用处理状态
  const [uploadProgress, setUploadProgress] = useState(0); // <-- 新增
  const [clientError, setClientError] = useState('');
  const [useE2EE, setUseE2EE] = useState(false); // <-- 双模开关
  const formRef = useRef<HTMLFormElement>(null);

  // 移除不再需要的 effect，因为我们直接管理 result

  const handleReset = () => {
    setResult(null); // 将 result 置空，UI 会自动切换回表单视图
    setFormKey(Date.now()); // 同时更新 key 来确保表单内部状态被完全重置
    setSelectedFile(null);
    setClientError('');
    setUseE2EE(false);
  };

  // --- 正确修复: 先验证管理员密码，再进行任何昂贵操作 ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientError('');
    setIsProcessing(true);
    setUploadProgress(0);

    const formData = new FormData(formRef.current!);
    const isE2EE = (formData.get('useE2EE') as string) === 'true';
    const adminPassword = formData.get('adminPassword') as string;

    try {
      // 【关键修复】第一步：使用轻量级函数验证管理员密码（不产生任何费用）
      const adminVerification = await verifyAdminPasswordOnly(adminPassword);
      if (!adminVerification.success) {
        throw new Error(adminVerification.message || '管理员密码验证失败');
      }

      // 【关键修复】只有管理员密码验证通过后，才进行昂贵的操作
      let masterKey: string | null = null;
      if (isE2EE) {
        // --- E2EE 模式: 所有加密在这里完成 ---
        masterKey = await generateKey();
        // 🔒 安全修复：密钥绝不发送到服务端，只在客户端使用
        // formData.append('encryptionKey', masterKey); // ← 删除这行！

        // 1. 处理密码
        let passwordToEncrypt = formData.get('customPassword') as string;
        if (!passwordToEncrypt) {
          passwordToEncrypt = nanoid(16); 
        }
        const encryptedPassword = await encryptMessage(masterKey, passwordToEncrypt);
        formData.append('passwordCipher', encryptedPassword);
        formData.delete('customPassword');

        // 2. 处理附加消息
        const message = formData.get('message') as string;
        if (message) {
          const encryptedMessage = await encryptMessage(masterKey, message);
          formData.append('messageCipher', encryptedMessage);
        }
        formData.delete('message');
      }

      // 3. 处理文件上传（现在在管理员密码验证之后）
      if (selectedFile) {
        if (selectedFile.size > maxUploadSizeBytes) {
          throw new Error(`文件大小不能超过 ${maxUploadSizeMB}MB`);
        }
        
        const fileEncryptionKey = isE2EE ? masterKey : await generateKey();
        if (!fileEncryptionKey) {
            throw new Error("Failed to generate or retrieve file encryption key.");
        }

        if (!isE2EE) {
            formData.append('fileKey', fileEncryptionKey); 
            formData.append('originalFilename', selectedFile.name);
            formData.append('originalFileType', selectedFile.type);
        }

        const encryptedFileBlob = await encryptFile(fileEncryptionKey!, selectedFile);
        
        const newBlob = await upload(selectedFile.name, encryptedFileBlob, {
          access: 'public',
          handleUploadUrl: '/api/blob/upload',
          onUploadProgress: (progress) => setUploadProgress(progress.percentage),
          clientPayload: undefined,
          headers: { 'x-blob-secret': blobSharedSecret || '' },
        });

        formData.append('fileUrl', newBlob.url);
        formData.append('fileSize', selectedFile.size.toString());

        if (isE2EE) {
          const encryptedFilename = await encryptMessage(fileEncryptionKey!, selectedFile.name);
          const encryptedType = await encryptMessage(fileEncryptionKey!, selectedFile.type);
          formData.append('fileEncryptedFilename', encryptedFilename);
          formData.append('fileEncryptedType', encryptedType);
        } else {
           formData.append('originalFilename', selectedFile.name);
           formData.append('originalFileType', selectedFile.type);
        }
      }
      
      // 直接调用 Server Action 获取结果
      const serverResult = await generateSecureLink({} as GenerateActionResult, formData);

      // 🔒 E2EE 安全修复：客户端处理最终 URL 生成
      if (isE2EE && masterKey && serverResult.url && !serverResult.error) {
        // 客户端追加密钥到 hash
        const finalUrl = `${serverResult.url}#${masterKey}`;
        
        // 更新结果，但不包含密码（E2EE 模式下客户端已知密码）
        setResult({ url: finalUrl });
      } else {
        // 非 E2EE 模式或出错，直接使用服务端结果
        setResult(serverResult);
      }

    } catch (err: unknown) {
      setClientError((err as Error).message || '客户端处理失败。');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 新增: 互斥逻辑 ---
  // 当启用E2EE时禁用2FA
  useEffect(() => {
    if (useE2EE && enable2FA) {
      setEnable2FA(false);
    }
  }, [useE2EE, enable2FA]);

  // 当启用2FA时禁用E2EE
  useEffect(() => {
    if (enable2FA && useE2EE) {
      setUseE2EE(false);
    }
  }, [enable2FA, useE2EE]);


  return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-300">
          {!result?.url ? (
            <>
              <div className="flex items-center justify-between">
                {/* 左侧：标题 */}
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">生成安全密码</h1>
                </div>
                {/* 右侧：Chat 按钮 */}
                <Link 
                  href="/chat" 
                  className="px-4 py-2 font-semibold text-cyan-600 dark:text-cyan-400 border-2 border-cyan-500 dark:border-cyan-400 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900 transition-colors"
                >
                  聊天室
                </Link>
              </div>
              <form key={_formKey} ref={formRef} onSubmit={handleSubmit} className="space-y-4"> {/* <-- 改为 onSubmit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">管理员密码</label>
                  <input name="adminPassword" type="password" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="flex items-center text-gray-700 dark:text-gray-300">
                    <input name="enable2FA" type="checkbox" checked={enable2FA} onChange={() => setEnable2FA(!enable2FA)} value={String(enable2FA)} className="mr-2 text-blue-600 focus:ring-blue-500" disabled={useE2EE || !isResendConfigured} />
                    启用二次验证 (2FA)
                  </label>
                  {useE2EE && (
                    <p className="text-xs text-red-500 dark:text-red-400 ml-6">已启用端到端加密，无法使用二次验证。</p>
                  )}
                  {!isResendConfigured && (
                    <p className="text-xs text-red-500 dark:text-red-400 ml-6">需要在环境变量中正确配置 RESEND_API_KEY 才能使用二次验证。</p>
                  )}
                </div>
                {enable2FA && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">邮箱地址</label>
                    <input name="email" type="email" required={enable2FA} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-colors" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">失效时间 (小时, 默认72)</label>
                  <input name="expiry" type="number" placeholder="72" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">附加消息 (可缺省)</label>
                  <input name="message" type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义密码 (可缺省)</label>
                  <input name="customPassword" type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="flex items-center font-medium text-gray-700 dark:text-gray-300">
                    <input 
                      name="useE2EE" 
                      type="checkbox" 
                      checked={useE2EE} 
                      onChange={(e) => setUseE2EE(e.target.checked)} 
                      value="true" // <-- The value when checked 
                      className="mr-2 h-4 w-4" 
                      disabled={enable2FA}
                    />
                    启用端到端加密 (E2EE)
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    {useE2EE 
                      ? '所有内容都在您的浏览器中加密，密钥在链接 #hash 中。由于服务端无法解密，无法提供邮件二次验证。' 
                      : '当前模式（服务端加密）支持邮件二次验证。链接更短。'}
                  </p>
                  {enable2FA && (
                    <p className="text-xs text-red-500 dark:text-red-400 ml-6">已启用二次验证，端到端加密不可用。</p>
                  )}
                </div>
                <div>
                  <label className="flex items-center text-gray-700 dark:text-gray-300">
                    <input name="burnAfterRead" type="checkbox" checked={burnAfterRead} onChange={() => setBurnAfterRead(!burnAfterRead)} value={String(burnAfterRead)} className="mr-2 text-blue-600 focus:ring-blue-500" />
                    强制阅后即焚
                  </label>
                </div>
                {/* --- 新增: 条件渲染的文件上传 --- */}
                {isUploadEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">附加文件 (可选, 最大 {maxUploadSizeMB}MB)</label>
                    <input 
                      name="file" 
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800 transition-colors"
                    />
                  </div>
                )}
                {isProcessing && selectedFile && (
                  <div className="my-2">
                    <p className="text-sm text-blue-600 dark:text-blue-400">正在处理文件: {uploadProgress}%</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                )}

                <SubmitButton isProcessing={isProcessing} />
                  {(result?.error || clientError) && (
                    <div className="text-red-600 dark:text-red-400">
                      <p>错误: {result?.error || clientError}</p>
                    </div>
                )}
              </form>
            </>
          ) : (

             <div className="mt-6 p-4 border border-gray-200 dark:border-gray-600 rounded-md text-center">
                <h2 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4">生成成功!</h2>
                {result.password && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">系统生成密码:</p>
                    <pre className="p-2 mt-1 font-mono bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded break-all">{result.password}</pre>
                  </div>
                )}
                {result.url && (
                  <>
                    <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">您的安全链接:</p>
                    <div>
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="p-2 mt-1 block text-blue-600 dark:text-blue-400 break-all bg-green-100 dark:bg-green-900 rounded-md hover:bg-green-200 dark:hover:bg-green-800 transition-colors">{result.url}</a>
                    </div>
                  </>

                )}
                 <button onClick={handleReset} className="mt-6 w-full px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 rounded-md transition-colors">
                    创建另一个
                </button>
            </div>
          )}
        </div>
  );
}