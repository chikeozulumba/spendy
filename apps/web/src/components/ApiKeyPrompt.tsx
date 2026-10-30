import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { api } from "../api";
import { Button } from "./ui/Button";
import { ApiKeyModal } from "./ApiKeyModal";

// Non-admin accounts can't process anything on the app's own Anthropic key,
// so a new (or key-less) user is asked for theirs as soon as they sign in
// rather than discovering it on their first failed upload. The dialog opens
// once per page load; the banner stays at the top of the shell until a key
// is saved, so dismissing the dialog never leaves them without a way back.
export function ApiKeyPrompt() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [prompted, setPrompted] = useState(false);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe(getToken),
  });
  const me = meQuery.data;

  useEffect(() => {
    if (me?.requiresApiKey && !prompted) {
      setOpen(true);
      setPrompted(true);
    }
  }, [me?.requiresApiKey, prompted]);

  return (
    <>
      {me?.requiresApiKey && (
        <div className="border-b border-moss-500/30 bg-moss-500/10 px-4 py-2.5 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="flex items-center gap-2 text-sm text-text-100">
              <KeyRound className="size-4 shrink-0 text-moss-400" strokeWidth={1.8} />
              Add your Anthropic API key to start processing statements and receipts.
            </p>
            <Button onClick={() => setOpen(true)} className="px-3 py-1.5">
              Add API key
            </Button>
          </div>
        </div>
      )}
      <ApiKeyModal open={open} onOpenChange={setOpen} me={me} />
    </>
  );
}
