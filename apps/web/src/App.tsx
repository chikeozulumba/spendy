import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import clsx from "clsx";
import UploadPage from "./pages/UploadPage";
import StatementsListPage from "./pages/StatementsListPage";
import StatementDetailPage from "./pages/StatementDetailPage";
import BudgetsPage from "./pages/BudgetsPage";
import ComparePage from "./pages/ComparePage";
import Logo from "./components/Logo";
import { Button } from "./components/ui/Button";

const NAV_LINKS = [
  { to: "/budgets", label: "Budgets" },
  { to: "/compare", label: "Compare" },
];

export default function App() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="transition-opacity hover:opacity-80">
              <Logo />
            </Link>
            <SignedIn>
              <nav className="flex items-center gap-5">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={clsx(
                      "text-sm font-medium transition-colors",
                      location.pathname === link.to
                        ? "text-text-100"
                        : "text-text-400 hover:text-text-100"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SignedIn>
          </div>
          <SignedIn>
            <div className="flex items-center gap-4">
              {location.pathname !== "/upload" && (
                <Link to="/upload">
                  <Button>
                    <Plus className="size-4" />
                    Upload statement
                  </Button>
                </Link>
              )}
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <SignedOut>
          <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-5 text-center">
            <Logo showWordmark={false} className="scale-150" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-text-100">
                Every statement, reconciled.
              </h1>
              <p className="mt-2 text-text-400">
                Sign in to upload a bank statement — Spendy extracts the
                transactions, checks the math, and sorts the spending.
              </p>
            </div>
            <SignInButton mode="modal">
              <Button className="mt-1">Sign in to continue</Button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <Routes>
            <Route path="/" element={<StatementsListPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/statements/:id" element={<StatementDetailPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/compare" element={<ComparePage />} />
          </Routes>
        </SignedIn>
      </main>
    </div>
  );
}
