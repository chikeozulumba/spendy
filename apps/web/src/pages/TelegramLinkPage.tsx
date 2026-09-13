import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, MessageCircle, Send } from "lucide-react";
import { api } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CategoryBadge } from "../components/ui/CategoryBadge";
import { TableSkeleton } from "../components/skeletons/TableSkeleton";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";

const DOCUMENT_COLUMNS = [
  { header: "Date", width: "35%" },
  { header: "Description", width: "70%" },
  { header: "Category", width: "45%" },
  { header: "Amount", width: "30%" },
];

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

  const statusQuery = useQuery({
    queryKey: ["telegram-status"],
    queryFn: () => api.getTelegramStatus(getToken),
  });
  const linked = statusQuery.data?.linked ?? false;

  const documentsQuery = useQuery({
    queryKey: ["all-transactions", "telegram"],
    queryFn: () => api.getAllTransactions(getToken, { source: "telegram" }),
    enabled: linked,
  });

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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-100">Link Telegram</h1>
        <p className="mt-1 text-sm text-text-400">
          Capture cash payments, informal transfers, and loans your bank statements can't see —
          send a photo or PDF to the bot and answer a couple of quick questions.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Get a linking code</CardTitle>
              <CardDescription>
                Generates a one-time code, valid for 15 minutes, that links this Telegram chat to
                your Spendy account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {(!token || expired) && (
                <Button
                  onClick={() => generate.mutate()}
                  disabled={generate.isPending}
                  className="self-start"
                >
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
                    Expires in{" "}
                    {secondsLeft !== null
                      ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                      : "…"}
                  </p>
                </>
              )}

              {expired && (
                <p className="text-sm text-rust-400">
                  That code expired. Generate a new one and use it right away.
                </p>
              )}

              {linked && (
                <p className="inline-flex items-center gap-1.5 text-xs text-moss-400">
                  <Check className="size-3.5" strokeWidth={2} />
                  This account is linked to a Telegram chat.
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
                <li>
                  3. The bot asks a couple of quick questions — what it was for, which bank (or
                  cash), and whether it's a loan.
                </li>
                <li>
                  4. Reply "done" to confirm and log it — it shows up in your ledger like any
                  other transaction.
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card className="p-0">
          <CardHeader className="mb-0 border-b-0 px-5 pt-5 pb-4">
            <CardTitle>Documents you've sent</CardTitle>
            <CardDescription>Everything logged via Telegram, newest first.</CardDescription>
          </CardHeader>
          {!linked && (
            <p className="px-5 pb-5 text-sm text-text-400">
              Link your account to see documents you've sent here.
            </p>
          )}
          {linked && documentsQuery.isLoading && (
            <TableSkeleton columns={DOCUMENT_COLUMNS} rows={5} />
          )}
          {linked && documentsQuery.data && documentsQuery.data.rows.length === 0 && (
            <p className="px-5 pb-5 text-sm text-text-400">
              Nothing sent yet — send a photo or PDF to the bot to log your first one.
            </p>
          )}
          {linked && documentsQuery.data && documentsQuery.data.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-text-400">
                    <th className="px-5 py-2.5 font-medium">Date</th>
                    <th className="px-5 py-2.5 font-medium">Description</th>
                    <th className="px-5 py-2.5 font-medium">Category</th>
                    <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {documentsQuery.data.rows.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-b-0">
                      <td className="whitespace-nowrap px-5 py-3 font-mono tabular text-text-400">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-5 py-3 text-text-100">{row.description}</td>
                      <td className="px-5 py-3">
                        <CategoryBadge category={row.category} />
                      </td>
                      <td
                        className={
                          "whitespace-nowrap px-5 py-3 text-right font-mono tabular " +
                          (row.direction === "credit" ? "text-moss-400" : "text-rust-400")
                        }
                      >
                        {row.direction === "credit" ? "+" : "−"}
                        {formatCurrency(Number(row.amount), row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
