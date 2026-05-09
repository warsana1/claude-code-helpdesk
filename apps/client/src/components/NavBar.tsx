import { useNavigate, Link, useLocation } from "react-router";
import { Sun, Moon } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { useTheme } from "../lib/theme";

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = authClient.useSession();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/login");
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-primary text-base leading-none select-none">◆</span>
            <span className="text-foreground font-semibold tracking-[0.1em] text-sm uppercase">
              HelpDesk
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/tickets"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive("/tickets")
                  ? "text-foreground bg-foreground/8"
                  : "text-muted-foreground hover:text-secondary-foreground hover:bg-foreground/5"
              }`}
            >
              Tickets
            </Link>
            {session?.user.role === "admin" && (
              <Link
                to="/users"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive("/users")
                    ? "text-foreground bg-foreground/8"
                    : "text-muted-foreground hover:text-secondary-foreground hover:bg-foreground/5"
                }`}
              >
                Users
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/70 font-medium truncate max-w-[120px]">
            {session?.user.name}
          </span>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-border transition-all"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:border-border bg-card hover:bg-muted transition-all font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
