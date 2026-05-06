import { useNavigate, Link } from "react-router";
import { authClient } from "../lib/auth-client";

export function NavBar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-bold text-gray-900">HelpDesk</Link>
        <Link to="/tickets" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
          Tickets
        </Link>
        {session?.user.role === "admin" && (
          <Link to="/users" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{session?.user.name}</span>
        <button
          onClick={handleSignOut}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
