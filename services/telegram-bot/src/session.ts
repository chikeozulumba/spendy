import { redis } from "./redis.js";
import { env } from "./env.js";

export interface SessionTurn {
  role: "user" | "agent";
  message: string;
  ts: string;
}

// Live session state (Section 5's Redis schema) — ephemeral, and never
// itself the durable record; telegram_sessions_log is written once,
// separately, at session end (see queue.ts / index.ts's expiry handler).
export interface Session {
  userId: string;
  chatId: string;
  storagePath: string;
  mimeType: string;
  turns: SessionTurn[];
  // Set once the conversational agent signals it has enough information
  // (Section 6.3) — gates whether a "done" reply is actually treated as the
  // end-of-session confirmation (Section 8: "never end the session
  // unilaterally") or just an ordinary message to feed back to the agent.
  readyToEnd: boolean;
  startedAt: string;
  lastActivityAt: string;
}

function dataKey(chatId: string): string {
  return `trends:session:${chatId}`;
}

// A Redis "expired" keyspace event only tells you which key expired, not
// what it held — Redis has already discarded the value by the time the
// event fires. So the actual session data key carries no TTL at all; this
// tiny sentinel key holds the TTL instead (refreshed alongside every save),
// and index.ts's expiry subscriber uses ITS expiry to know when to look up
// and log the still-present session data as abandoned, then delete it.
function ttlSentinelKey(chatId: string): string {
  return `trends:session-ttl:${chatId}`;
}

export function chatIdFromTtlSentinelKey(key: string): string | null {
  const match = key.match(/^trends:session-ttl:(.+)$/);
  return match ? match[1]! : null;
}

export async function getSession(chatId: string): Promise<Session | null> {
  const raw = await redis.get(dataKey(chatId));
  return raw ? (JSON.parse(raw) as Session) : null;
}

async function save(session: Session): Promise<void> {
  await redis.set(dataKey(session.chatId), JSON.stringify(session));
  await redis.set(ttlSentinelKey(session.chatId), "1", "EX", env.sessionTtlSeconds);
}

export async function createSession(input: {
  userId: string;
  chatId: string;
  storagePath: string;
  mimeType: string;
}): Promise<Session> {
  const now = new Date().toISOString();
  const session: Session = {
    ...input,
    turns: [],
    readyToEnd: false,
    startedAt: now,
    lastActivityAt: now,
  };
  await save(session);
  return session;
}

export async function appendTurn(
  chatId: string,
  turn: SessionTurn,
  readyToEnd: boolean
): Promise<Session | null> {
  const session = await getSession(chatId);
  if (!session) return null;
  session.turns.push(turn);
  session.readyToEnd = readyToEnd;
  session.lastActivityAt = new Date().toISOString();
  await save(session);
  return session;
}

export async function deleteSession(chatId: string): Promise<void> {
  await redis.del(dataKey(chatId), ttlSentinelKey(chatId));
}
