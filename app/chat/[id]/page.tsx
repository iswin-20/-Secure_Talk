// app/chat/[id]/page.tsx
import { decrypt } from '@/lib/crypto';
import { getChatAccessData, getChatHistory } from '../actions';
import ChatClient from './ChatClient';
import RoleSelector from './RoleSelector';
import { headers } from 'next/headers';
import { checkIpAccess } from '@/lib/access-control';

interface ChatPageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const chatId = params.id;
  const participant = typeof searchParams.p === 'string' && searchParams.p.length > 0 ? searchParams.p : undefined;

  // No participant selected — show role selector
  if (!participant) {
    const { participants, error } = await getChatHistory(chatId);
    if (error) {
      return <div className="text-center p-8 text-red-500">{error}</div>;
    }
    return <RoleSelector chatId={chatId} participants={participants || []} />;
  }

  // Check IP access
  const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';
  const ipAccessResult = await checkIpAccess(chatId, participant, ip);

  if (!ipAccessResult.success) {
    return <div className="text-center p-8 text-xl font-bold text-red-600">{ipAccessResult.error}</div>;
  }

  // Get participants list to validate participant and get color
  const { participants, error: participantsError } = await getChatHistory(chatId);
  if (participantsError) {
    return <div className="text-center p-8 text-red-500">{participantsError}</div>;
  }

  // Validate that this participant exists in the chat
  const participantData = participants?.find(p => p.id === participant);
  if (!participantData) {
    return <div className="text-center p-8 text-red-500">This participant is not part of this chat.</div>;
  }

  // Get encrypted access password
  const { accessPasswordCipher, error } = await getChatAccessData(chatId);
  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  // Decrypt access password on server
  const accessPassword = accessPasswordCipher ? decrypt(accessPasswordCipher) : undefined;

  return (
    <ChatClient
      chatId={chatId}
      myIdentity={participant}
      myColor={participantData.color}
      participants={participants || []}
      requiredAccessPassword={accessPassword}
    />
  );
}
