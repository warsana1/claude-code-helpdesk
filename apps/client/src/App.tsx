import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router";
import { authClient } from "./lib/auth-client";
import { NavBar } from "./components/NavBar";
import { LoginPage } from "./pages/LoginPage";

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
        element={session ? <HomePage /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

function HomePage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "calc(100vh - 65px)" }}
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">HelpDesk</h1>
          <p className="mt-2 text-gray-500">AI-powered ticket management</p>
          <p className="mt-4 text-sm">
            {status === "loading" && (
              <span className="text-gray-400">Checking server...</span>
            )}
            {status === "ok" && (
              <span className="text-green-600">Server is online</span>
            )}
            {status === "error" && (
              <span className="text-red-500">Server is unreachable</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
