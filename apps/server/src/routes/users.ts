import { Router } from "express";
import { createUserSchema, updateUserSchema } from "@helpdesk/core";
import { prisma } from "../db";
import { Role } from "../generated/prisma";
import { hashPassword } from "@better-auth/utils/password";
import { requireAdmin } from "../middleware/auth";

const router = Router();

function firstIssue(result: { error: { issues: Array<{ message: string }> } }) {
  return result.error.issues[0].message;
}

router.get("/me", (req, res) => {
  const { user } = res.locals.session;
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.get("/", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

router.post("/", requireAdmin, async (req, res, next) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: firstIssue(result) });

  const { name, email, password } = result.data;
  const id = crypto.randomUUID();
  const hash = await hashPassword(password);
  try {
    const user = await prisma.user.create({
      data: {
        id,
        name: name.trim(),
        email: email.trim(),
        emailVerified: true,
        role: Role.agent,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: id,
            providerId: "credential",
            password: hash,
          },
        },
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAdmin, async (req, res, next) => {
  const result = updateUserSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: firstIssue(result) });

  const { name, email, password } = result.data;
  const id = req.params.id as string;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { name: name.trim(), email: email.trim() },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (password.trim().length >= 8) {
      const hash = await hashPassword(password.trim());
      await prisma.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password: hash },
      });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

export { router as usersRouter };
