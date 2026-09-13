import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/Dialog";
import { UploadForm } from "./UploadForm";
import { useUploadModal } from "../context/UploadModalContext";

export function UploadModal() {
  const { isOpen, close } = useUploadModal();
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a bank statement</DialogTitle>
          <DialogDescription>
            PDF only. It's encrypted at rest and used only to extract transactions.
          </DialogDescription>
        </DialogHeader>
        <UploadForm
          onSuccess={(statementId) => {
            close();
            navigate(`/statements/${statementId}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
