// app/chat/[id]/FileMessage.tsx
'use client';

import { useState, useEffect } from 'react';
import type { FileMetadata } from '@/lib/types';
import { decryptMessage, decryptFile } from '@/lib/chat-crypto';

interface FileMessageProps {
  fileMeta: FileMetadata;
  accessKey: string;
}

export default function FileMessage({ fileMeta, accessKey }: FileMessageProps) {
  const [decryptedFilename, setDecryptedFilename] = useState('Loading...');
  const [decryptedType, setDecryptedType] = useState('');
  const [decryptedObjectUrl, setDecryptedObjectUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState('');

  // 初始解密文件名
  useEffect(() => {
  // 【关键修正】在调用前检查
    if (accessKey && fileMeta.encryptedFilename) {
      decryptMessage(accessKey, fileMeta.encryptedFilename)
        .then(setDecryptedFilename)
        .catch(() => setDecryptedFilename('Failed to decrypt filename'));
    }
    
    if (accessKey && fileMeta.encryptedType) {
      decryptMessage(accessKey, fileMeta.encryptedType)
          .then(setDecryptedType)
          .catch(() => setDecryptedType(''));
    }
  }, [accessKey, fileMeta]);

  const handleDownloadAndDecrypt = async () => {
    if (isDecrypting || decryptedObjectUrl) return;

    setIsDecrypting(true);
    setError('');
    try {
      const response = await fetch(fileMeta.url);
      if (!response.ok) throw new Error('Failed to download file.');
      
      const encryptedBlob = await response.blob();
      const decryptedBuffer = await decryptFile(accessKey, encryptedBlob);
      
      const decryptedBlob = new Blob([decryptedBuffer], { type: decryptedType });
      const objectUrl = URL.createObjectURL(decryptedBlob);
      setDecryptedObjectUrl(objectUrl);
    } catch (err) {
      setError('Failed to decrypt file. The key might be incorrect or the file corrupted.');
      console.error(err);
    } finally {
      setIsDecrypting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = decryptedType.startsWith('image/');

  if (decryptedObjectUrl) {
    return (
      <div>
        {isImage ? (
          <img src={decryptedObjectUrl} alt={decryptedFilename} className="max-w-full h-auto rounded-md" />
        ) : (
          <a href={decryptedObjectUrl} download={decryptedFilename} className="text-indigo-400 hover:underline">
            Download: {decryptedFilename}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="p-2 border border-dashed border-gray-400 rounded-md">
      <p className="font-semibold break-all">{decryptedFilename}</p>
      <p className="text-xs text-gray-500">{formatSize(fileMeta.size)}</p>
      <button
        onClick={handleDownloadAndDecrypt}
        disabled={isDecrypting}
        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
      >
        {isDecrypting ? 'Decrypting...' : (isImage ? 'Click to View' : 'Click to Download')}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}