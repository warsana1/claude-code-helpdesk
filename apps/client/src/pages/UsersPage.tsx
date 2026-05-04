import { NavBar } from "../components/NavBar";

export function UsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
      </div>
    </div>
  );
}
