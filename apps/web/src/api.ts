import type {
  AllTransactions,
  Budget,
  BudgetSummary,
  Insights,
  LoanRow,
  LoanStatus,
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

  getAllTransactions: (getToken: GetToken, source?: TransactionSource) =>
    request<AllTransactions>(
      getToken,
      `/transactions${source ? `?source=${source}` : ""}`
    ),

  getTelegramStatus: (getToken: GetToken) =>
    request<{ linked: boolean }>(getToken, "/telegram/status"),

  getLoans: (getToken: GetToken, status?: LoanStatus) =>
    request<LoanRow[]>(getToken, `/loans${status ? `?status=${status}` : ""}`),

  updateLoan: (getToken: GetToken, id: string, changes: { status?: LoanStatus; notes?: string }) =>
    request<{ id: string; status: LoanStatus; notes: string | null }>(getToken, `/loans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),

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
};
