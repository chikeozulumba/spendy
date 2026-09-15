import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { api } from "../api";
import { Button } from "./ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/Dialog";
import type { MeInfo } from "../types";

export function ApiKeyModal({
  open,
  onOpenChange,
  me,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: MeInfo | undefined;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");

  const save = useMutation({
    mutationFn: () => api.saveAnthropicApiKey(getToken, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setApiKey("");
      onOpenChange(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.removeAnthropicApiKey(getToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-moss-400" strokeWidth={1.8} />
            Use your own Anthropic API key
          </DialogTitle>
          <DialogDescription>
            Statements and Telegram transactions processed with your own key don't count against
            your account's usage limit — you're billed directly by Anthropic instead.
          </DialogDescription>
        </DialogHeader>

        {me?.hasOwnApiKey ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg border border-moss-500/30 bg-moss-500/10 px-4 py-3 text-sm text-moss-300">
              A key is on file for this account — processing is unlimited.
            </p>
            <Button
              variant="danger"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="self-start"
            >
              {remove.isPending ? "Removing…" : "Remove key"}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <input
              type="password"
              placeholder="sk-ant-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="rounded-md border border-line bg-ink-850 px-3 py-2 font-mono text-sm text-text-100 outline-none focus:border-moss-500"
            />
            <p className="text-xs text-text-600">
              Find or create a key at{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-text-400"
              >
                console.anthropic.com
              </a>
              . We encrypt it at rest and only use it to process your own data.
            </p>
            <Button type="submit" disabled={!apiKey.trim() || save.isPending}>
              {save.isPending ? "Verifying…" : "Save key"}
            </Button>
            {save.isError && (
              <p className="rounded-lg border border-rust-600 bg-rust-600/10 px-4 py-3 text-sm text-rust-400">
                {(save.error as Error).message}
              </p>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
