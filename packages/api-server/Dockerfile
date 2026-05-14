FROM oven/bun:1-alpine AS install
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/api-server/package.json packages/api-server/package.json
COPY packages/dashboard/package.json packages/dashboard/package.json
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=install /app/node_modules node_modules
COPY --from=install /app/packages/api-server/node_modules packages/api-server/node_modules
COPY packages/api-server/ packages/api-server/
CMD ["bun", "run", "--filter", "@timnoya/api-server", "start"]
