import { api, type GetToken } from "../api";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

// The Push API wants the VAPID public key as a raw Uint8Array, not the
// base64url string it's generated/transmitted as everywhere else.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications(getToken: GetToken): Promise<PushSubscription> {
  if (!VAPID_PUBLIC_KEY) throw new Error("Push notifications are not configured for this deployment");
  if (!pushSupported()) throw new Error("This browser doesn't support push notifications");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted");

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await api.subscribeToPush(getToken, subscription.toJSON() as PushSubscriptionJSON);
  return subscription;
}

export async function disablePushNotifications(getToken: GetToken): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  await api.unsubscribeFromPush(getToken, subscription.endpoint);
  await subscription.unsubscribe();
}
