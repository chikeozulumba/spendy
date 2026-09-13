import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "./components/ui/Tooltip";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./styles.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toaster
            position="bottom-right"
            richColors
            style={
              {
                fontFamily: "var(--font-sans)",
                "--normal-bg": "var(--color-ink-900)",
                "--normal-border": "var(--color-line)",
                "--normal-text": "var(--color-text-100)",
                "--error-bg": "#fbeae7",
                "--error-border": "var(--color-rust-600)",
                "--error-text": "var(--color-rust-400)",
                "--success-bg": "#e9f3ec",
                "--success-border": "var(--color-moss-600)",
                "--success-text": "var(--color-moss-400)",
              } as React.CSSProperties
            }
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>
);
