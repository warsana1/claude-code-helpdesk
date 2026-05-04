import type { Request, Response, NextFunction } from "express";
import { auth } from "../auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers as any });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.locals.session = session;
  next();
}

export async function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  const session = res.locals.session;
  if (!session || session.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
