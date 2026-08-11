import { getSessionUser } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import LobbyPage from "@/components/LobbyPage";

export const dynamic = 'force-dynamic';

export interface Room {
  id: string;
  name: string;
  creator: string;
  creator_id: number;
  is_public: boolean;
  participant_count: number;
  created_at: number;
}

export default async function HomePage() {
  const user = getSessionUser();

  if (!user) {
    redirect("/auth");
  }

  const userObj = { id: user.id, username: user.username };

  // 公开房间 + 当前用户创建的私密房间
  const rows = db.prepare(
    `SELECT r.id, r.name, u.username as creator, r.creator_id, r.is_public, r.participant_count, r.created_at
     FROM rooms r JOIN users u ON r.creator_id = u.id
     WHERE r.is_public = 1 OR r.creator_id = ?
     ORDER BY r.created_at DESC LIMIT 50`
  ).all(user.id) as Room[];

  return <LobbyPage user={userObj} rooms={rows} />;
}
