import { env } from "./env.js";
import type { SessionTurn } from "./session.js";

const MODEL = "claude-sonnet-5";
const API_URL = "https://api.anthropic.com/v1/messages";

export class LlmJsonError extends Error {}

// Same fence-stripping approach as services/pdf-service/app/llm.py's
// _extract_json_block — Claude is asked for JSON only, but this defends
// against it wrapping the reply in a code fence anyway, including a fence
// left unterminated by a truncated response.
function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/);
  if (fenced) return fenced[1]!;
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
}

async function callJson(system: string, user: string, maxTokens: number): Promise<unknown> {
  let lastError: string | undefined;
  let userContent = user;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        // Same reasoning as pdf-service's llm.py: extended thinking is on by
        // default for Sonnet 5 and can silently consume the whole token
        // budget on a deterministic task like this, leaving zero answer text.
        thinking: { type: "disabled" },
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      stop_reason: string;
      content: { type: string; text?: string }[];
    };

    if (data.stop_reason === "max_tokens") {
      throw new LlmJsonError(
        `response was truncated at the ${maxTokens}-token limit before completing`
      );
    }

    const raw = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");

    try {
      return JSON.parse(extractJsonBlock(raw));
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      userContent = `${userContent}\n\nYour previous response was not valid JSON and could not be parsed. Respond again with ONLY valid JSON, no commentary, no markdown fences.`;
    }
  }

  throw new LlmJsonError(`LLM did not return valid JSON after retry: ${lastError}`);
}

const CONVERSATION_SYSTEM_PROMPT = `You are Spendy's Trends assistant, having a short chat over Telegram
with a user who just sent a photo or PDF of a payment/receipt. Your job is to gather
just enough context to log it as a categorized transaction — and, if it's a loan
they expect back, capture who it's for and when they expect repayment.

Rules:
- Ask at most 2-3 follow-up questions total before proposing to end the session.
  Do not drag this into an open-ended back-and-forth.
- If the user hasn't already said whether this is a loan they expect repaid, you
  MUST explicitly ask ("Is this a loan you expect to get back?") before proposing
  to end the session — this determines whether a loan is tracked afterward.
- Once you have enough information (what the payment was for, and loan status +
  counterparty + expected repayment date if it's a loan and those are knowable),
  say so plainly and ask the user to reply "done" to confirm and log it, or add
  more detail first.
- You never end the session yourself — only the user's explicit "done" reply does
  that, outside of this conversation. If the user replies "done" before you've
  said you have enough information, tell them what's still missing and ask again;
  do not treat their "done" as agreement.
- If a repayment date genuinely isn't known or stated, that's fine — do not
  pressure the user to invent one.
- Keep replies short (1-3 sentences), plain conversational text — no markdown,
  no JSON in the reply text itself.

Return ONLY strict JSON, no commentary, no markdown fences, matching:
{"message": "<the reply to send the user>", "ready": <true if you just told the user you have enough information and asked them to confirm with "done", else false>}`;

export async function nextConversationTurn(turns: SessionTurn[]): Promise<{
  message: string;
  ready: boolean;
}> {
  const transcript = turns.length
    ? turns.map((t) => `${t.role === "user" ? "User" : "You"}: ${t.message}`).join("\n")
    : "(The user just sent a document with no message yet — ask your first question.)";

  const result = await callJson(CONVERSATION_SYSTEM_PROMPT, transcript, 1024);
  if (
    typeof result !== "object" ||
    result === null ||
    typeof (result as { message?: unknown }).message !== "string" ||
    typeof (result as { ready?: unknown }).ready !== "boolean"
  ) {
    throw new LlmJsonError("Conversational agent response missing 'message'/'ready'");
  }
  return result as { message: string; ready: boolean };
}
