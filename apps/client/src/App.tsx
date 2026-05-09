import { Routes, Route, Navigate } from "react-router";
import { authClient } from "./lib/auth-client";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { TicketsPage } from "./pages/TicketsPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { DashboardPage } from "./pages/DashboardPage";

export default function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={session ? <DashboardPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/tickets"
        element={session ? <TicketsPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/tickets/:id"
        element={session ? <TicketDetailPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/users"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : session.user.role === "admin" ? (
            <UsersPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}
