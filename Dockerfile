FROM oven/bun:1-alpine AS dashboard-build
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/dashboard/package.json packages/dashboard/package.json
RUN bun install --frozen-lockfile
COPY packages/dashboard/ packages/dashboard/
RUN bun run --cwd packages/dashboard build

FROM rust:1-alpine AS api-build
RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static
WORKDIR /app
COPY packages/api-server/Cargo.toml packages/api-server/Cargo.lock ./
COPY packages/api-server/src/ src/
COPY packages/api-server/migrations/ migrations/
RUN cargo build --release

FROM alpine:3
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=api-build /app/target/release/timnoya-api-server /app/server
COPY --from=dashboard-build /app/packages/dashboard/dist /app/dist
COPY packages/api-server/migrations/ /app/migrations/
RUN mkdir /data
VOLUME /data
ENV DB_PATH=/data/brightness.db
ENV STATIC_DIR=/app/dist
ENV RUST_LOG=info
EXPOSE 3000
CMD ["./server"]
