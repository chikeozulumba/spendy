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

async function callJson(
  system: string,
  user: string,
  maxTokens: number,
  apiKeyOverride?: string
): Promise<unknown> {
  let lastError: string | undefined;
  let userContent = user;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKeyOverride ?? env.anthropicApiKey,
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

function conversationSystemPrompt(taxonomy: string[]): string {
  return `You are Spendy's Trends assistant, having a short chat over Telegram
with a user who just sent a photo or PDF of a payment/receipt. Your job is to gather
just enough context to log it as a categorized transaction — and, if it's a loan
they expect back, capture who it's for and when they expect repayment.

The app's existing spending categories are: ${taxonomy.join(", ")}.

Rules:
- Ask at most 2-3 follow-up questions total before ending the conversation.
  Do not drag this into an open-ended back-and-forth — combine questions into
  one message where it reads naturally (e.g. loan status + bank name together)
  rather than always asking one at a time.
- If the user hasn't already said whether this is a loan they expect repaid, you
  MUST explicitly ask ("Is this a loan you expect to get back?") before you're
  done — this determines whether a loan is tracked afterward.
- If the bank/institution this went through isn't already stated or clearly
  legible on the document itself, you MUST ask which bank it was (e.g. "Which
  bank was this through?") before you're done — unless the user has said it
  was cash, in which case don't ask, there's no bank to name.
- If what the payment was for doesn't clearly fit any of the existing
  categories above, don't just force it into the closest one — say so, propose
  a short, sensible new category name, and ask the user to confirm it (or say
  which existing category to use instead) before you're done. A clean fit with
  an existing category needs no such check.
- Once you have enough information (what the payment was for and which
  category fits, the bank/cash status, and loan status + counterparty +
  expected repayment date if it's a loan and those are knowable), you're done —
  set "ready" to true and let your message be a brief closing confirmation of
  what you're about to log (e.g. "Got it — logging this as groceries via
  GTBank."), not a question. Logging happens automatically the moment you say
  you're ready; the user does not need to reply "done" or confirm again.
- If a repayment date genuinely isn't known or stated, that's fine — do not
  pressure the user to invent one.
- Keep replies short (1-3 sentences), plain conversational text — no markdown,
  no JSON in the reply text itself.

Return ONLY strict JSON, no commentary, no markdown fences, matching:
{"message": "<the reply to send the user>", "ready": <true once you have everything above and your message is a closing confirmation rather than a question, else false>}`;
}

export async function nextConversationTurn(
  turns: SessionTurn[],
  taxonomy: string[],
  apiKeyOverride?: string
): Promise<{
  message: string;
  ready: boolean;
}> {
  const transcript = turns.length
    ? turns.map((t) => `${t.role === "user" ? "User" : "You"}: ${t.message}`).join("\n")
    : "(The user just sent a document with no message yet — ask your first question.)";

  const result = await callJson(conversationSystemPrompt(taxonomy), transcript, 1024, apiKeyOverride);
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
