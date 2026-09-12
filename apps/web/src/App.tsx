import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Link, Route, Routes } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import StatementsListPage from "./pages/StatementsListPage";
import StatementDetailPage from "./pages/StatementDetailPage";
import Logo from "./components/Logo";
import { Button } from "./components/ui/Button";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
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
          </Routes>
        </SignedIn>
      </main>
    </div>
  );
}
