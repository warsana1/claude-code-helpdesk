# HelpDesk — Project Memory

## Project Overview

AI-powered ticket management system. Agents handle support tickets; Claude API auto-classifies, summarizes, and suggests replies.

See `project-scope.md` for full feature list and `tech-stack.md` for technology choices.

## Monorepo Structure

```
HelpDesk/
├── apps/
│   ├── server/   # Express + TypeScript backend (port 3001)
│   └── client/   # React + Vite + Tailwind frontend (port 5173)
├── package.json  # Bun workspace root
└── tsconfig.base.json
```

## Dev Commands

```bash
bun dev:server   # start backend (hot-reload via --hot)
bun dev:client   # start frontend (Vite HMR)
bun dev          # start both in parallel
bun install      # install all workspace deps
```

## Conventions

- Runtime: **Bun** (no Node/ts-node needed — Bun runs TypeScript natively)
- Backend entry: `apps/server/src/index.ts`
- API routes live in `apps/server/src/routes/`
- Frontend proxies `/api/*` to `http://localhost:3001` via Vite config
- Tailwind v4: no config file — just `@import "tailwindcss"` in `index.css`
- React Router v7: import from `react-router` (merged package, no `-dom` suffix)

## Documentation

Always use **Context7 MCP** to fetch up-to-date docs before writing code that involves any library or framework. Never rely solely on training data.

### Workflow

1. Call `resolve-library-id` with the library name and the current question
2. Pick the best match (highest benchmark score + source reputation)
3. Call `query-docs` with the selected library ID and the full question
4. If the answer is unsatisfactory, retry with `researchMode: true`
5. Write code using the fetched docs

### Key library IDs (pre-resolved)

| Library | Context7 ID |
|---|---|
| Bun | `/oven-sh/bun` |
| Express | `/expressjs/express` |
| Vite | `/vitejs/vite` |
| Prisma | resolve at query time |
| React Router | resolve at query time |
| Tailwind CSS | resolve at query time |
| Anthropic SDK | resolve at query time |
