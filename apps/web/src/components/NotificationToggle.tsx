import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { Switch } from "./ui/Switch";
import {
  disablePushNotifications,
  enablePushNotifications,
  getExistingSubscription,
  pushSupported,
} from "../lib/push";

type State = "loading" | "enabled" | "disabled" | "unsupported";

/** Lives in the notifications drawer's footer — enables/disables browser
 * push notifications for statement processing results and loan reminders.
 * Errors surface via the app-wide toast handler (lib/queryClient.ts's global
 * MutationCache.onError). */
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
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-100">Browser notifications</p>
        <p className="text-xs text-text-400">
          {enabled ? "On — you'll get alerts even when Spendy isn't open." : "Off — turn on to get alerts here too."}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={() => toggle.mutate()}
        id="browser-notifications-toggle"
        disabled={toggle.isPending}
      />
    </div>
  );
}
