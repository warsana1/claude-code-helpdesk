import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Pencil } from "lucide-react";
import { NavBar } from "../components/NavBar";
import { CreateUserModal } from "../components/CreateUserModal";

type User = { id: string; name: string; email: string; role: string; createdAt: string };

async function fetchUsers(): Promise<User[]> {
  const { data } = await axios.get<User[]>("/api/users", { withCredentials: true });
  return data;
}

export function UsersPage() {
  const { data: users, isPending, isError } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  function handleCloseModal() {
    setShowModal(false);
    setEditingUser(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Create User
          </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name", "Email", "Role", "Joined"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isPending
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-48 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                : users?.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                          aria-label={`Edit ${u.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        {isError && <p className="mt-4 text-sm text-red-500">Failed to load users.</p>}
      </div>
      {(showModal || editingUser !== null) && (
        <CreateUserModal
          onClose={handleCloseModal}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
          user={editingUser ?? undefined}
        />
      )}
    </div>
  );
}
