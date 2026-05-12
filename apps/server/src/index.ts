import "./instrument";
import * as Sentry from "@sentry/node";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { join } from "node:path";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { ticketsRouter } from "./routes/tickets";
import { usersRouter } from "./routes/users";
import { webhooksRouter } from "./routes/webhooks";
import { statsRouter } from "./routes/stats";
import { requireAuth } from "./middleware/auth";
import { Prisma } from "./generated/prisma";
import { startBoss } from "./jobs/boss";

if (!process.env.BETTER_AUTH_SECRET) {
  console.error("FATAL: BETTER_AUTH_SECRET is not set");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT ?? 3001;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

if (process.env.NODE_ENV === "production") {
  const signInLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: { error: "Too many login attempts, please try again later." },
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  app.use("/api/auth/sign-in", signInLimiter);
}
app.all("/api/auth/*path", toNodeHandler(auth));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/webhooks", webhooksRouter);
app.use("/api/tickets", requireAuth, ticketsRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/stats", requireAuth, statsRouter);

if (process.env.NODE_ENV === "production") {
  const clientDist = join(import.meta.dir, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("/*path", (_req, res) => {
    res.sendFile(join(clientDist, "index.html"));
  });
}

Sentry.setupExpressErrorHandler(app);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  )
    return res
      .status(409)
      .json({ error: "A record with that value already exists." });
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
};
app.use(errorHandler);

startBoss()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start pg-boss:", err);
    process.exit(1);
  });
