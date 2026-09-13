import { createContext, useContext, useState, type ReactNode } from "react";

interface UploadModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const UploadModalContext = createContext<UploadModalState | null>(null);

export function UploadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <UploadModalContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </UploadModalContext.Provider>
  );
}

/** Lets any page (the header's button, an empty-state CTA, ...) open the upload modal without prop drilling. */
export function useUploadModal() {
  const ctx = useContext(UploadModalContext);
  if (!ctx) throw new Error("useUploadModal must be used within UploadModalProvider");
  return ctx;
}
