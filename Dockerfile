FROM oven/bun:1.4
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
ENV NODE_ENV=production HOST=0.0.0.0
EXPOSE 4000
# Migrations are idempotent; DATABASE_URL points at the persistent disk.
CMD ["sh", "-c", "bun scripts/migrate.ts && bun apps/api/src/server.ts"]
