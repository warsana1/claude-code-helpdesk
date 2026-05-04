import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { NavBar } from "../components/NavBar";

type User = { id: string; name: string; email: string; role: string; createdAt: string };

async function fetchUsers(): Promise<User[]> {
  const { data } = await axios.get<User[]>("/api/users", { withCredentials: true });
  return data;
}

export function UsersPage() {
  const { data: users, isPending, isError } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Users</h1>
        {isPending && <p className="text-sm text-gray-500">Loading...</p>}
        {isError && <p className="text-sm text-red-500">Failed to load users.</p>}
        {users && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Name", "Email", "Role", "Joined"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
