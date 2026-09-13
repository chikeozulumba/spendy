import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Menu, Plus } from "lucide-react";
import clsx from "clsx";
import StatementsListPage from "./pages/StatementsListPage";
import StatementDetailPage from "./pages/StatementDetailPage";
import BudgetsPage from "./pages/BudgetsPage";
import ComparePage from "./pages/ComparePage";
import TelegramLinkPage from "./pages/TelegramLinkPage";
import Logo from "./components/Logo";
import { Button } from "./components/ui/Button";
import { NotificationToggle } from "./components/NotificationToggle";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/Popover";
import { UploadModal } from "./components/UploadModal";
import { UploadModalProvider, useUploadModal } from "./context/UploadModalContext";

const NAV_LINKS = [
  { to: "/budgets", label: "Budgets" },
  { to: "/compare", label: "Compare" },
  { to: "/telegram", label: "Telegram" },
];

export default function App() {
  return (
    <UploadModalProvider>
      <AppShell />
    </UploadModalProvider>
  );
}

function AppShell() {
  const location = useLocation();
  const { open: openUploadModal } = useUploadModal();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 sm:gap-6">
          <div className="flex min-w-0 items-center gap-8">
            <SignedIn>
              <Popover open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line text-text-400 hover:border-line-strong hover:text-text-100 sm:hidden"
                    aria-label="Open menu"
                  >
                    <Menu className="size-4" strokeWidth={1.8} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-1">
                  <nav className="flex flex-col">
                    {NAV_LINKS.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileNavOpen(false)}
                        className={clsx(
                          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          location.pathname === link.to
                            ? "bg-ink-850 text-text-100"
                            : "text-text-400 hover:bg-ink-850 hover:text-text-100"
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </PopoverContent>
              </Popover>
            </SignedIn>

            <Link to="/" className="min-w-0 shrink-0 transition-opacity hover:opacity-80">
              <span className="sm:hidden">
                <Logo showWordmark={false} />
              </span>
              <span className="hidden sm:inline-flex">
                <Logo />
              </span>
            </Link>

            <SignedIn>
              <nav className="hidden items-center gap-5 sm:flex">
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
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <NotificationToggle />
              <Button onClick={openUploadModal} className="px-2.5 sm:px-4">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Upload statement</span>
              </Button>
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
            <Route path="/statements/:id" element={<StatementDetailPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/telegram" element={<TelegramLinkPage />} />
          </Routes>
          <UploadModal />
        </SignedIn>
      </main>
    </div>
  );
}
