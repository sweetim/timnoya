FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/api-server/package.json packages/api-server/package.json
COPY packages/dashboard/package.json packages/dashboard/package.json
RUN bun install --frozen-lockfile

FROM base AS api
COPY packages/api-server/ packages/api-server/
CMD ["bun", "run", "--filter", "@timnoya/api-server", "start"]

FROM base AS dashboard
COPY packages/dashboard/ packages/dashboard/
CMD ["bun", "run", "--filter", "@timnoya/dashboard", "start"]
