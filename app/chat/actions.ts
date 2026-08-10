// app/chat/actions.ts
'use server';

import { redis } from '@/lib/redis';
import { nanoid } from 'nanoid';
import { encrypt } from '@/lib/crypto';
import { writeLog } from '@/lib/rateLimit';
import type { ChatData, EncryptedMessage, Participant } from '@/lib/types';
import { destroyChatRoom } from '@/lib/destroy-logic';
import { revalidatePath } from 'next/cache';
import { generateLinkLogic } from '@/lib/generate-logic';
import { headers } from 'next/headers';

const CHAT_EXPIRY = 3 * 24 * 3600;

const PARTICIPANT_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#2563eb', '#65a30d', '#ea580c',
  '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#06b6d4',
];

// 1. Create group chat
export async function createChat(
  adminPassword: string,
  accessPassword?: string,
  inactiveHours: number = 72,
  ipLockingEnabled: boolean = false,
  participantCount: number = 2,
): Promise<{ success: boolean; links?: string[]; participants?: Participant[]; error?: string }> {
  try {
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return { success: false, error: 'Unauthorized' };
    }

    const chatId = nanoid(7);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const count = Math.max(2, Math.min(participantCount, 15));

    // Generate participants
    const participants: Participant[] = [];
    for (let i = 0; i < count; i++) {
      participants.push({
        id: nanoid(4),
        color: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
      });
    }

    const initialChatData: ChatData = {
      messages: [],
      inactiveHours,
      accessPasswordCipher: accessPassword ? encrypt(accessPassword) : undefined,
      ipLockingEnabled,
      participants,
    };

    await redis.set(`chat:${chatId}`, JSON.stringify(initialChatData), { ex: CHAT_EXPIRY });
    await writeLog(`chat:create`, chatId, { action: 'CHAT_CREATED', participantCount: String(count) });

    const baseUrl = `${appUrl}/chat/${chatId}`;
    const links = participants.map(p => `${baseUrl}?p=${p.id}`);

    return { success: true, links, participants };
  } catch (e) {
    console.error('Create chat error:', e);
    return { success: false, error: 'Failed to create chat due to a server error.' };
  }
}

// 2. Get chat access data
export async function getChatAccessData(chatId: string): Promise<{ accessPasswordCipher?: string; participants?: Participant[]; error?: string }> {
  try {
    const data: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!data) return { error: 'Chat not found or expired.' };
    return { accessPasswordCipher: data.accessPasswordCipher, participants: data.participants };
  } catch (e) {
    console.error('Get chat access data error:', e);
    return { error: 'Failed to fetch chat data.' };
  }
}

// 3. Get chat history
export async function getChatHistory(chatId: string): Promise<{ messages?: EncryptedMessage[]; participants?: Participant[]; destroyVotes?: string[]; error?: string }> {
  try {
    const data: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!data) return { error: 'Chat not found or expired.' };
    return { messages: data.messages, participants: data.participants, destroyVotes: data.destroyVotes };
  } catch (e) {
    console.error('Get chat history error:', e);
    return { error: 'Failed to fetch chat history.' };
  }
}

// 4. Post message
export async function postMessage(chatId: string, message: EncryptedMessage): Promise<{ success: boolean; error?: string }> {
  try {
    const currentData: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!currentData) return { success: false, error: 'Chat not found or expired.' };
    if (!Array.isArray(currentData.messages)) currentData.messages = [];
    currentData.messages.push(message);
    const newExpiryInSeconds = (currentData.inactiveHours || 72) * 3600;
    await redis.set(`chat:${chatId}`, currentData, { ex: newExpiryInSeconds });
    revalidatePath(`/chat/${chatId}`);
    return { success: true };
  } catch (e) {
    console.error('Post message error:', e);
    return { success: false, error: 'Failed to post message due to a server error.' };
  }
}

// 5. Destroy chat
export async function destroyChat(chatId: string): Promise<{ success: boolean; error?: string }> {
  const result = await destroyChatRoom(chatId);
  if (result.success) revalidatePath(`/chat/${chatId}`);
  return result;
}

// 6. Claim a participant slot
export async function claimParticipant(
  chatId: string,
  participantId: string,
): Promise<{ success: boolean; color?: string; error?: string }> {
  try {
    const data: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!data) return { success: false, error: 'Chat not found or expired.' };

    const participant = data.participants.find(p => p.id === participantId);
    if (!participant) return { success: false, error: 'Invalid participant.' };
    if (participant.claimed) return { success: false, error: '此角色已被选择。' };

    participant.claimed = true;
    await redis.set(`chat:${chatId}`, data, { ex: CHAT_EXPIRY });

    return { success: true, color: participant.color };
  } catch (e) {
    console.error('Claim participant error:', e);
    return { success: false, error: 'Failed to claim participant slot.' };
  }
}

// 7. Toggle reaction on a message
export async function toggleReaction(
  chatId: string,
  messageTimestamp: number,
  emoji: string,
  participantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const data: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!data) return { success: false, error: 'Chat not found or expired.' };

    const msg = data.messages.find(m => m.timestamp === messageTimestamp);
    if (!msg) return { success: false, error: 'Message not found.' };

    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

    const idx = msg.reactions[emoji].indexOf(participantId);
    if (idx >= 0) {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].push(participantId);
    }

    await redis.set(`chat:${chatId}`, data, { ex: CHAT_EXPIRY });
    return { success: true };
  } catch (e) {
    console.error('Toggle reaction error:', e);
    return { success: false, error: 'Failed to toggle reaction.' };
  }
}

// 8. Delete all messages sent by the current user (stay in chat)
export async function deleteMyMessages(
  chatId: string,
  myIdentity: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const data: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!data) return { success: false, error: 'Chat not found or expired.' };

    data.messages = data.messages.filter(m => m.sender !== myIdentity);

    await redis.set(`chat:${chatId}`, data, { ex: CHAT_EXPIRY });
    revalidatePath(`/chat/${chatId}`);

    return { success: true };
  } catch (e) {
    console.error('Delete my messages error:', e);
    return { success: false, error: 'Failed to delete messages.' };
  }
}

// 8b. Leave chat: delete messages + remove from participants + clear vote
export async function leaveChat(
  chatId: string,
  myIdentity: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const data: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!data) return { success: false, error: 'Chat not found or expired.' };

    data.messages = data.messages.filter(m => m.sender !== myIdentity);
    data.participants = data.participants.filter(p => p.id !== myIdentity);
    // Remove their vote if they voted
    if (data.destroyVotes) {
      data.destroyVotes = data.destroyVotes.filter(v => v !== myIdentity);
    }

    await redis.set(`chat:${chatId}`, data, { ex: CHAT_EXPIRY });
    revalidatePath(`/chat/${chatId}`);

    return { success: true };
  } catch (e) {
    console.error('Leave chat error:', e);
    return { success: false, error: 'Failed to leave chat.' };
  }
}

// 9. Delete a single message
export async function deleteSingleMessage(
  chatId: string,
  timestamp: number,
  myIdentity: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const data: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!data) return { success: false, error: 'Chat not found or expired.' };

    const before = data.messages.length;
    data.messages = data.messages.filter(m => !(m.timestamp === timestamp && m.sender === myIdentity));

    if (data.messages.length === before) {
      return { success: false, error: '消息未找到或无权删除。' };
    }

    await redis.set(`chat:${chatId}`, data, { ex: CHAT_EXPIRY });
    revalidatePath(`/chat/${chatId}`);

    return { success: true };
  } catch (e) {
    console.error('Delete single message error:', e);
    return { success: false, error: 'Failed to delete message.' };
  }
}

// 10. Vote to destroy chat
export async function voteDestroyChat(
  chatId: string,
  participantId: string,
): Promise<{ success: boolean; destroyed?: boolean; votesNeeded?: number; currentVotes?: number; error?: string }> {
  try {
    const data: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!data) return { success: false, error: 'Chat not found or expired.' };

    // Initialize destroyVotes if not present
    if (!data.destroyVotes) data.destroyVotes = [];

    const claimedCount = data.participants.filter(p => p.claimed).length;
    const votesNeeded = Math.max(1, Math.ceil(claimedCount / 2));

    // Toggle vote
    const idx = data.destroyVotes.indexOf(participantId);
    if (idx >= 0) {
      data.destroyVotes.splice(idx, 1);
    } else {
      data.destroyVotes.push(participantId);
    }

    const currentVotes = data.destroyVotes.length;

    // Check if threshold reached
    if (currentVotes >= votesNeeded) {
      await destroyChatRoom(chatId);
      revalidatePath(`/chat/${chatId}`);
      return { success: true, destroyed: true, votesNeeded, currentVotes };
    }

    await redis.set(`chat:${chatId}`, data, { ex: CHAT_EXPIRY });
    revalidatePath(`/chat/${chatId}`);

    return { success: true, destroyed: false, votesNeeded, currentVotes };
  } catch (e) {
    console.error('Vote destroy chat error:', e);
    return { success: false, error: 'Failed to vote.' };
  }
}

// 11. Generate burn link for a participant
export async function generateBurnLinkForChat(
  adminPassword: string,
  messageForBurnLink: string,
  linkForParticipant: string
): Promise<{ url?: string; error?: string }> {
  try {
    const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';
    const result = await generateLinkLogic({
      adminPassword,
      customPassword: linkForParticipant,
      message: messageForBurnLink,
      burnAfterRead: true,
      enable2FA: false,
      email: null,
      expiry: null,
      ip,
      useE2EE: false,
      encryptionKey: null,
    });
    if (result.error) return { error: result.error };
    return { url: result.data?.url };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    console.error('Failed to generate burn link for chat:', errorMessage);
    return { error: `服务器内部错误: ${errorMessage}` };
  }
}
