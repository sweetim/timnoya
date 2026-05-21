FROM oven/bun:1-alpine AS install
WORKDIR /app
COPY packages/api-server/package.json package.json
RUN bun install --production && rm -rf node_modules/.bun

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=install /app/node_modules node_modules
COPY packages/api-server/drizzle drizzle/
COPY packages/api-server/src src/
RUN mkdir /data
VOLUME /data
CMD ["bun", "run", "src/index.ts"]
