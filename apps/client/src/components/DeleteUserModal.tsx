import { useEffect, useState } from "react";
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete User</h2>
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">{user.name}</span>?
          This action cannot be undone.
        </p>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
