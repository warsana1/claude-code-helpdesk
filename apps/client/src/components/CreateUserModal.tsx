import { useEffect } from "react";
import { UserForm } from "./UserForm";

type Props = { onClose: () => void; onSuccess: () => void };

export function CreateUserModal({ onClose, onSuccess }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create User</h2>
        <UserForm onClose={onClose} onSuccess={onSuccess} />
      </div>
    </div>
  );
}
