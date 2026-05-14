FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/dashboard/package.json packages/dashboard/package.json
RUN bun install --frozen-lockfile

FROM base
COPY packages/dashboard/ packages/dashboard/
CMD ["bun", "run", "--filter", "@timnoya/dashboard", "start"]
