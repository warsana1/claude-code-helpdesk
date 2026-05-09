import { useEffect } from "react";
import { X } from "lucide-react";
import { UserForm } from "./UserForm";

type EditUser = { id: string; name: string; email: string };
type Props = { onClose: () => void; onSuccess: () => void; user?: EditUser };

export function CreateUserModal({ onClose, onSuccess, user }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-foreground/20 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px h-px w-24 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">
            {user ? "Edit User" : "Create User"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground/60 hover:text-secondary-foreground hover:bg-foreground/5 rounded-md transition-all"
          >
            <X size={15} />
          </button>
        </div>
        <UserForm onClose={onClose} onSuccess={onSuccess} user={user} />
      </div>
    </div>
  );
}
