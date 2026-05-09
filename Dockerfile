FROM oven/bun:1

WORKDIR /app

# Copy manifests first for layer caching — source changes won't bust the install layer
COPY package.json bun.lock ./
COPY packages/core/package.json ./packages/core/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

RUN bun install --frozen-lockfile

# Copy all source (node_modules excluded via .dockerignore)
COPY . .

# Generate Prisma client (reads schema only — no DB connection needed)
RUN cd apps/server && bunx prisma generate

# Build the React client (vite build only — tsc is for dev-time type checking)
RUN cd apps/client && bunx vite build

EXPOSE 3001

# Apply pending migrations, then start the server
CMD ["sh", "-c", "cd apps/server && bunx prisma migrate deploy && bun --preload ./src/instrument.ts ./src/index.ts"]
