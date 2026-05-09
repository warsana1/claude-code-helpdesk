import { useEffect, useState } from "react";
import { X, TriangleAlert } from "lucide-react";
import axios from "axios";

type Props = {
  user: { id: string; name: string };
  onClose: () => void;
  onSuccess: () => void;
};

export function DeleteUserModal({ user, onClose, onSuccess }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await axios.delete(`/api/users/${user.id}`, { withCredentials: true });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? "Something went wrong.")
          : "Network error. Please try again."
      );
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-foreground/20 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px h-px w-24 bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <TriangleAlert size={15} className="text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Delete User</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-muted-foreground/60 hover:text-secondary-foreground hover:bg-foreground/5 rounded-md transition-all"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          Delete{" "}
          <span className="font-medium text-foreground/80">{user.name}</span>?
          {" "}This action cannot be undone.
        </p>

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3.5 py-2.5 mb-4">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-secondary-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
