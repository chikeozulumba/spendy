/** TEMPORARY design-review harness. Delete preview.html + this file when done. */
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import StatementsListPage from "./pages/StatementsListPage";
import "./styles.css";
import type { StatementSummary, SpendingOverview, SpendingByBankOverview } from "./types";

const statements: StatementSummary[] = [
  {
    id: "1",
    originalFilename: "chase-oct-2025.pdf",
    status: "done",
    openingBalance: "1000",
    closingBalance: "500",
    statementPeriodStart: "2025-10-01T00:00:00.000Z",
    statementPeriodEnd: "2025-10-31T00:00:00.000Z",
    reconciliationOk: true,
    currency: "USD",
    bankName: "Chase",
    createdAt: "2025-11-01T00:00:00.000Z",
  },
  {
    id: "2",
    originalFilename: "amex-nov-2025.pdf",
    status: "processing",
    openingBalance: null,
    closingBalance: null,
    statementPeriodStart: null,
    statementPeriodEnd: null,
    reconciliationOk: null,
    currency: "USD",
    bankName: "American Express",
    createdAt: "2025-11-05T00:00:00.000Z",
  },
  {
    id: "3",
    originalFilename: "wells-fargo-sep-2025.pdf",
    status: "done",
    openingBalance: "2000",
    closingBalance: "1200",
    statementPeriodStart: "2025-09-01T00:00:00.000Z",
    statementPeriodEnd: "2025-09-30T00:00:00.000Z",
    reconciliationOk: false,
    currency: "USD",
    bankName: "Wells Fargo",
    createdAt: "2025-10-01T00:00:00.000Z",
  },
  {
    id: "4",
    originalFilename: "unknown-bank-aug-2025.pdf",
    status: "done",
    openingBalance: "500",
    closingBalance: "400",
    statementPeriodStart: "2025-08-01T00:00:00.000Z",
    statementPeriodEnd: "2025-08-31T00:00:00.000Z",
    reconciliationOk: true,
    currency: "EUR",
    bankName: null,
    createdAt: "2025-09-01T00:00:00.000Z",
  },
];

const overview: SpendingOverview = {
  rows: [
    { year: 2024, category: "Food & Groceries", currency: "USD", total: "4900" },
    { year: 2024, category: "Rent/Housing", currency: "USD", total: "22800" },
    { year: 2025, category: "Food & Groceries", currency: "USD", total: "5400" },
    { year: 2025, category: "Rent/Housing", currency: "USD", total: "23400" },
  ],
  primaryCurrency: "USD",
};

const bankOverview: SpendingByBankOverview = {
  rows: [
    { bankName: "Chase", currency: "USD", total: "12500" },
    { bankName: "Wells Fargo", currency: "USD", total: "6200" },
  ],
  primaryCurrency: "USD",
};

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
queryClient.setQueryData(["statements"], statements);
queryClient.setQueryData(["spending-overview"], overview);
queryClient.setQueryData(["spending-by-bank"], bankOverview);

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function Preview() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <MemoryRouter>
        <StatementsListPage />
      </MemoryRouter>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkKey}>
      <QueryClientProvider client={queryClient}>
        <Preview />
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>
);
