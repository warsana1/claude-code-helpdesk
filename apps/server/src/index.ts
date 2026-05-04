import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { ticketsRouter } from "./routes/tickets";
import { requireAuth, requireAdmin } from "./middleware/auth";

if (!process.env.BETTER_AUTH_SECRET) {
  console.error("FATAL: BETTER_AUTH_SECRET is not set");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json());

const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many login attempts, please try again later." },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use("/api/auth/sign-in", signInLimiter);
app.all("/api/auth/*", toNodeHandler(auth));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (_req, res) => {
  const { user } = res.locals.session;
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

app.use("/api/tickets", requireAuth, ticketsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
