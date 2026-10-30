import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { ApiKeyModal } from "./ApiKeyModal";

// Non-admin accounts can't process anything on the app's own Anthropic key,
// so a new (or key-less) user is asked for theirs as soon as they sign in
// rather than discovering it on their first failed upload. Shown once per
// page load — dismissing it leaves the upload form's own prompt in place.
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

  return <ApiKeyModal open={open} onOpenChange={setOpen} me={me} />;
}
