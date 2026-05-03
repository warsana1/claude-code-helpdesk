import { Router, type Request, type Response } from "express";

export const ticketsRouter = Router();

ticketsRouter.get("/", (_req: Request, res: Response) => {
  res.json({ tickets: [] });
});

ticketsRouter.get("/:id", (req: Request, res: Response) => {
  res.json({ ticket: null, id: req.params.id });
});
