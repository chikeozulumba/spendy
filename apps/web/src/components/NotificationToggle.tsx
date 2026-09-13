import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import {
  disablePushNotifications,
  enablePushNotifications,
  getExistingSubscription,
  pushSupported,
} from "../lib/push";

type State = "loading" | "enabled" | "disabled" | "unsupported";

/** Bell toggle in the header — enables/disables browser push notifications
 * for statement processing results. Errors surface via the app-wide toast
 * handler (lib/queryClient.ts's global MutationCache.onError). */
export function NotificationToggle() {
  const { getToken } = useAuth();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!pushSupported()) {
      setState("unsupported");
      return;
    }
    getExistingSubscription().then((sub) => setState(sub ? "enabled" : "disabled"));
  }, []);

  const toggle = useMutation({
    mutationFn: async () => {
      if (state === "enabled") {
        await disablePushNotifications(getToken);
        return "disabled" as const;
      }
      await enablePushNotifications(getToken);
      return "enabled" as const;
    },
    onSuccess: setState,
  });

  if (state === "unsupported" || state === "loading") return null;

  const enabled = state === "enabled";

  return (
    <button
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      title={enabled ? "Notifications on — click to turn off" : "Turn on notifications"}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-text-400 transition-colors hover:border-line-strong hover:text-text-100 disabled:pointer-events-none disabled:opacity-50"
    >
      {enabled ? (
        <Bell className="size-4 text-moss-400" strokeWidth={1.8} />
      ) : (
        <BellOff className="size-4" strokeWidth={1.8} />
      )}
    </button>
  );
}
