// app/DarkModeToggle.tsx
"use client";

import { useState, useEffect } from 'react';

type Theme = 'system' | 'dark' | 'light';

// 图标组件
const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="m12 2 0 2"/>
        <path d="m12 20 0 2"/>
        <path d="m4.93 4.93 1.41 1.41"/>
        <path d="m17.66 17.66 1.41 1.41"/>
        <path d="M2 12h2"/>
        <path d="M20 12h2"/>
        <path d="m6.34 17.66-1.41 1.41"/>
        <path d="m19.07 4.93-1.41 1.41"/>
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
);

const SystemIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="8" x="5" y="2" rx="2"/>
        <rect width="20" height="8" x="2" y="14" rx="2"/>
        <path d="M6 18h2"/>
        <path d="M12 18h6"/>
    </svg>
);

export default function DarkModeToggle() {
    const [theme, setTheme] = useState<Theme>('system');
    const [showOptions, setShowOptions] = useState(false);

    // 初始化主题
    useEffect(() => {
        const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
        setTheme(savedTheme);
        applyTheme(savedTheme);
    }, []);

    const applyTheme = (newTheme: Theme) => {
        const root = document.documentElement;
        
        if (newTheme === 'dark') {
            root.classList.add('dark');
        } else if (newTheme === 'light') {
            root.classList.remove('dark');
        } else {
            // system
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    };

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        setShowOptions(false);
    };

    const getCurrentIcon = () => {
        if (theme === 'light') return <SunIcon />;
        if (theme === 'dark') return <MoonIcon />;
        return <SystemIcon />;
    };

    return (
        <div className="group fixed bottom-5 left-5 z-50 flex flex-col items-start">
            {/* 选项面板 */}
            {showOptions && (
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg mb-3 p-2 min-w-[120px]">
                    <button
                        onClick={() => handleThemeChange('light')}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            theme === 'light' 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300'
                        }`}
                    >
                        <SunIcon />
                        Light
                    </button>
                    <button
                        onClick={() => handleThemeChange('dark')}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            theme === 'dark' 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300'
                        }`}
                    >
                        <MoonIcon />
                        Dark
                    </button>
                    <button
                        onClick={() => handleThemeChange('system')}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            theme === 'system' 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300'
                        }`}
                    >
                        <SystemIcon />
                        System
                    </button>
                </div>
            )}

            {/* 浮动按钮 */}
            <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center justify-center bg-white dark:bg-gray-800 border dark:border-gray-700 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                aria-label="Toggle theme"
            >
                {getCurrentIcon()}
            </button>
        </div>
    );
}
