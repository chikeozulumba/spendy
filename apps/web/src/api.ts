import type {
  AllTransactions,
  Budget,
  BudgetSummary,
  ContactDetail,
  ContactScope,
  ContactsList,
  ContactSort,
  Insights,
  LoanRow,
  LoanStatus,
  NotificationsResponse,
  PeriodComparison,
  Scope,
  SpendingByBankOverview,
  SpendingOverview,
  StatementDetail,
  StatementSummary,
  Transaction,
  TransactionSource,
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
  uploadStatement: (
    getToken: GetToken,
    file: File,
    password?: string,
    bankName?: string
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (password) form.append("password", password);
    if (bankName) form.append("bankName", bankName);
    return request<{ id: string; status: string }>(getToken, "/statements", {
      method: "POST",
      body: form,
    });
  },

  getBankNames: (getToken: GetToken) => request<string[]>(getToken, "/statements/banks"),

  assignBank: (getToken: GetToken, id: string, bankName: string) =>
    request<{ id: string; bankName: string }>(getToken, `/statements/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ bankName }),
    }),

  deleteStatement: (getToken: GetToken, id: string) =>
    request(getToken, `/statements/${id}`, { method: "DELETE" }),

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

  getSpendingByBank: (getToken: GetToken) =>
    request<SpendingByBankOverview>(getToken, "/insights/spending-by-bank"),

  getScopes: (getToken: GetToken) => request<Scope[]>(getToken, "/scopes"),

  createScope: (getToken: GetToken, name: string, categories: string[]) =>
    request<Scope>(getToken, "/scopes", {
      method: "POST",
      body: JSON.stringify({ name, categories }),
    }),

  updateScope: (
    getToken: GetToken,
    id: string,
    changes: { name?: string; categories?: string[] }
  ) =>
    request<Scope>(getToken, `/scopes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),

  deleteScope: (getToken: GetToken, id: string) =>
    request(getToken, `/scopes/${id}`, { method: "DELETE" }),

  getBudgets: (getToken: GetToken, periodStart: string, periodEnd: string) =>
    request<Budget[]>(
      getToken,
      `/budgets?periodStart=${periodStart}&periodEnd=${periodEnd}`
    ),

  setBudget: (
    getToken: GetToken,
    input: {
      scopeId: string;
      periodStart: string;
      periodEnd: string;
      amount: number;
      currency: string;
    }
  ) =>
    request<Budget>(getToken, "/budgets", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteBudget: (getToken: GetToken, id: string) =>
    request(getToken, `/budgets/${id}`, { method: "DELETE" }),

  getBudgetSummary: (
    getToken: GetToken,
    periodStart: string,
    periodEnd: string,
    currency?: string
  ) =>
    request<BudgetSummary>(
      getToken,
      `/insights/budget-summary?periodStart=${periodStart}&periodEnd=${periodEnd}` +
        (currency ? `&currency=${currency}` : "")
    ),

  getPeriodComparison: (
    getToken: GetToken,
    input: { aStart: string; aEnd: string; bStart: string; bEnd: string; currency?: string }
  ) => {
    const params = new URLSearchParams({
      aStart: input.aStart,
      aEnd: input.aEnd,
      bStart: input.bStart,
      bEnd: input.bEnd,
      ...(input.currency ? { currency: input.currency } : {}),
    });
    return request<PeriodComparison>(getToken, `/insights/period-comparison?${params}`);
  },

  createTelegramLinkToken: (getToken: GetToken) =>
    request<{ token: string; expiresInMinutes: number }>(getToken, "/telegram/link-token", {
      method: "POST",
    }),

  getAllTransactions: (
    getToken: GetToken,
    input?: { source?: TransactionSource; category?: string; page?: number; pageSize?: number }
  ) => {
    const params = new URLSearchParams();
    if (input?.source) params.set("source", input.source);
    if (input?.category) params.set("category", input.category);
    if (input?.page) params.set("page", String(input.page));
    if (input?.pageSize) params.set("pageSize", String(input.pageSize));
    const query = params.toString();
    return request<AllTransactions>(getToken, `/transactions${query ? `?${query}` : ""}`);
  },

  getTelegramStatus: (getToken: GetToken) =>
    request<{ linked: boolean }>(getToken, "/telegram/status"),

  getLoans: (getToken: GetToken, status?: LoanStatus) =>
    request<LoanRow[]>(getToken, `/loans${status ? `?status=${status}` : ""}`),

  updateLoan: (getToken: GetToken, id: string, changes: { status?: LoanStatus; notes?: string }) =>
    request<{ id: string; status: LoanStatus; notes: string | null }>(getToken, `/loans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),

  getNotifications: (getToken: GetToken) =>
    request<NotificationsResponse>(getToken, "/notifications"),

  markNotificationRead: (getToken: GetToken, id: string) =>
    request(getToken, `/notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ read: true }),
    }),

  markAllNotificationsRead: (getToken: GetToken) =>
    request(getToken, "/notifications/read-all", { method: "POST" }),

  subscribeToPush: (getToken: GetToken, subscription: PushSubscriptionJSON) =>
    request(getToken, "/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    }),

  unsubscribeFromPush: (getToken: GetToken, endpoint: string) =>
    request(getToken, "/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    }),

  getContacts: (getToken: GetToken, input?: { sort?: ContactSort; q?: string; scope?: ContactScope }) => {
    const params = new URLSearchParams();
    if (input?.sort) params.set("sort", input.sort);
    if (input?.q) params.set("q", input.q);
    if (input?.scope) params.set("scope", input.scope);
    const query = params.toString();
    return request<ContactsList>(getToken, `/contacts${query ? `?${query}` : ""}`);
  },

  mergeContacts: (getToken: GetToken, input: { primaryContactId: string; mergeContactIds: string[] }) =>
    request<{ ok: boolean; primaryContactId: string; mergedCount: number }>(getToken, "/contacts/merge", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getContact: (getToken: GetToken, id: string, input?: { page?: number; pageSize?: number }) => {
    const params = new URLSearchParams();
    if (input?.page) params.set("page", String(input.page));
    if (input?.pageSize) params.set("pageSize", String(input.pageSize));
    const query = params.toString();
    return request<ContactDetail>(getToken, `/contacts/${id}${query ? `?${query}` : ""}`);
  },

  // Binary response (the original receipt/document), not JSON — opened in a
  // new tab as a blob URL rather than a plain <a href>, since the endpoint
  // requires the same bearer-token auth as every other request here.
  openTelegramDocument: async (getToken: GetToken, transactionId: string): Promise<void> => {
    const token = await getToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${API_BASE}/telegram/documents/${transactionId}`, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Request failed: ${res.status}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
