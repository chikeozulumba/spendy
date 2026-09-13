import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, MessageCircle, Send } from "lucide-react";
import { api } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

function useCountdown(expiresAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  if (!expiresAt) return null;
  return Math.max(0, Math.round((expiresAt - now) / 1000));
}

export default function TelegramLinkPage() {
  const { getToken } = useAuth();
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const secondsLeft = useCountdown(expiresAt);
  const expired = secondsLeft === 0;

  const generate = useMutation({
    mutationFn: () => api.createTelegramLinkToken(getToken),
    onSuccess: (result) => {
      setExpiresAt(Date.now() + result.expiresInMinutes * 60_000);
      setCopied(false);
    },
  });

  const token = generate.data?.token;
  const startCommand = token ? `/start ${token}` : "";
  const deepLink = token && BOT_USERNAME ? `https://t.me/${BOT_USERNAME}?start=${token}` : null;

  function copyCommand() {
    navigator.clipboard.writeText(startCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-100">Link Telegram</h1>
        <p className="mt-1 text-sm text-text-400">
          Capture cash payments, informal transfers, and loans your bank statements can't see —
          send a photo or PDF to the bot and answer a couple of quick questions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Get a linking code</CardTitle>
          <CardDescription>
            Generates a one-time code, valid for 15 minutes, that links this Telegram chat to your
            Spendy account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(!token || expired) && (
            <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="self-start">
              <MessageCircle className="size-4" />
              {generate.isPending
                ? "Generating…"
                : expired
                  ? "Generate a new code"
                  : "Generate link code"}
            </Button>
          )}

          {token && !expired && (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink-850 px-4 py-3">
                <code className="font-mono text-sm text-text-100">{startCommand}</code>
                <button
                  onClick={copyCommand}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-400 transition-colors hover:text-text-100"
                >
                  {copied ? (
                    <>
                      <Check className="size-4 text-moss-400" strokeWidth={1.8} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" strokeWidth={1.8} />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {deepLink ? (
                <a href={deepLink} target="_blank" rel="noreferrer">
                  <Button className="w-full">
                    <Send className="size-4" />
                    Open in Telegram
                  </Button>
                </a>
              ) : (
                <p className="text-sm text-text-400">
                  Open Telegram, start a chat with your Spendy bot, and send the code above.
                </p>
              )}

              <p className="text-xs text-text-600">
                Expires in {secondsLeft !== null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : "…"}
              </p>
            </>
          )}

          {expired && (
            <p className="text-sm text-rust-400">
              That code expired. Generate a new one and use it right away.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2 text-sm text-text-400">
            <li>1. Generate a code above and send it to the bot on Telegram.</li>
            <li>2. Send a photo or PDF of a receipt, cash payment, or transfer any time.</li>
            <li>3. The bot asks a couple of quick questions — what it was for, and whether it's a loan.</li>
            <li>4. Reply "done" to confirm and log it — it shows up in your ledger like any other transaction.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
