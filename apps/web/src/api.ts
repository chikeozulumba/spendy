import type {
  Insights,
  SpendingOverview,
  StatementDetail,
  StatementSummary,
  Transaction,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export type GetToken = () => Promise<string | null>;

async function request<T>(
  getToken: GetToken,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  uploadStatement: (getToken: GetToken, file: File, password?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (password) form.append("password", password);
    return request<{ id: string; status: string }>(getToken, "/statements", {
      method: "POST",
      body: form,
    });
  },

  reprocessStatement: (getToken: GetToken, id: string, password?: string) =>
    request<{ id: string; status: string }>(getToken, `/statements/${id}/reprocess`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  listStatements: (getToken: GetToken) =>
    request<StatementSummary[]>(getToken, "/statements"),

  getStatement: (getToken: GetToken, id: string) =>
    request<StatementDetail>(getToken, `/statements/${id}`),

  getTransactions: (getToken: GetToken, id: string) =>
    request<Transaction[]>(getToken, `/statements/${id}/transactions`),

  getInsights: (getToken: GetToken, id: string) =>
    request<Insights>(getToken, `/statements/${id}/insights`),

  recategorize: (getToken: GetToken, transactionId: string, category: string) =>
    request(getToken, `/transactions/${transactionId}`, {
      method: "PATCH",
      body: JSON.stringify({ category }),
    }),

  getSpendingOverview: (getToken: GetToken) =>
    request<SpendingOverview>(getToken, "/insights/spending-by-year"),
};
