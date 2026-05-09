import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

// In production the client is served by the same server, so use the current
// origin. In dev the Vite proxy forwards /api to localhost:3001.
const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : (import.meta.env.VITE_API_URL ?? "http://localhost:3001");

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string" },
      },
    }),
  ],
});
