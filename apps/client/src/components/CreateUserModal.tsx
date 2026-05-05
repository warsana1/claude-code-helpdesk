import { useEffect } from "react";
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {user ? "Edit User" : "Create User"}
        </h2>
        <UserForm onClose={onClose} onSuccess={onSuccess} user={user} />
      </div>
    </div>
  );
}
