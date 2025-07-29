// app/chat/page.tsx
import CreateChatClient from './CreateChatClient';
import Link from 'next/link';

export default function CreateChatPage() {
  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl transition-colors duration-300">
      <div className="flex items-center justify-between">
        {/* 左侧：标题 */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">创建一个安全聊天</h1>
        </div>
        {/* 右侧：Chat 按钮 */}
        <Link 
          href="/send" 
          className="px-4 py-2 font-semibold text-cyan-600 dark:text-cyan-400 border-2 border-cyan-500 dark:border-cyan-400 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900 transition-colors"
        >
          密码发送
        </Link>
      </div>
      <p className="text-left text-gray-600 dark:text-gray-400">
        创建一个端到端加密的聊天室
      </p>
      <CreateChatClient />
    </div>
  );
}