import { useEffect, useState } from "react";
import { Routes, Route } from "react-router";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">HelpDesk</h1>
        <p className="mt-2 text-gray-500">AI-powered ticket management</p>
        <p className="mt-4 text-sm">
          {status === "loading" && <span className="text-gray-400">Checking server...</span>}
          {status === "ok" && <span className="text-green-600">Server is online</span>}
          {status === "error" && <span className="text-red-500">Server is unreachable</span>}
        </p>
      </div>
    </div>
  );
}
