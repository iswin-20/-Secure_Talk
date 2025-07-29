// lib/chat-logic.ts
'use server';

import { nanoid } from 'nanoid';
import { redis } from '@/lib/redis';
import type { ChatData } from '@/lib/types';

export async function createChatRoomLogic(encryptionKey: string, expiryHours: number = 72) {
  const chatId = nanoid(7);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const chatData: ChatData = {
    messages: [],
    inactiveHours: expiryHours,
  };

  await redis.set(chatId, JSON.stringify(chatData), { ex: expiryHours * 3600 });

  return {
    chatId,
    participantA_url: `${appUrl}/chat/${chatId}?p=A#${encryptionKey}`,
    participantB_url: `${appUrl}/chat/${chatId}?p=B#${encryptionKey}`,
  };
}