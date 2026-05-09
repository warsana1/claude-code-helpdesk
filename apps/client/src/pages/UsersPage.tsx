import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Pencil, Trash2, Plus } from "lucide-react";
import { NavBar } from "../components/NavBar";
import { CreateUserModal } from "../components/CreateUserModal";
import { DeleteUserModal } from "../components/DeleteUserModal";

type User = { id: string; name: string; email: string; role: string; createdAt: string };

async function fetchUsers(): Promise<User[]> {
  const { data } = await axios.get<User[]>("/api/users", { withCredentials: true });
  return data;
}

export function UsersPage() {
  const { data: users, isPending, isError } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  function handleCloseModal() {
    setShowModal(false);
    setEditingUser(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Users</h1>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Create User
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                {["Name", "Email", "Role", "Joined"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isPending
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-48 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-14 bg-muted rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                : users?.map((u) => (
                    <tr key={u.id} className="hover:bg-primary/3 transition-colors">
                      <td className="px-4 py-3 text-foreground/80 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                            u.role === "admin"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 text-muted-foreground/60 hover:text-secondary-foreground hover:bg-foreground/5 rounded-md transition-all"
                            aria-label={`Edit ${u.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          {u.role !== "admin" && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                              aria-label={`Delete ${u.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {isError && <p className="mt-4 text-sm text-red-500 dark:text-red-400">Failed to load users.</p>}
      </div>

      {(showModal || editingUser !== null) && (
        <CreateUserModal
          onClose={handleCloseModal}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
          user={editingUser ?? undefined}
        />
      )}
      {deletingUser !== null && (
        <DeleteUserModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
        />
      )}
    </div>
  );
}
