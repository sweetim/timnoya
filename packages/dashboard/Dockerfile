FROM oven/bun:1-alpine AS install
WORKDIR /app
COPY packages/dashboard/package.json package.json
RUN bun install --production && rm -rf node_modules/.bun node_modules/@oven node_modules/bun

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=install /app/node_modules node_modules
COPY packages/dashboard/bunfig.toml ./
COPY packages/dashboard/tsconfig.json ./
COPY packages/dashboard/src src/
CMD ["bun", "run", "src/index.ts"]
