# syntax=docker/dockerfile:1

# ---- build: full workspace, compiles the API server and the frontend ----
FROM node:24-slim AS build
WORKDIR /app

RUN npm install -g pnpm@9

COPY . .
RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=8080
ENV BASE_PATH=/

RUN pnpm run typecheck:libs \
 && pnpm --filter @workspace/api-server run build \
 && pnpm --filter @workspace/rail-cut-calculator run build

# ---- runtime: just the compiled output, no dev tooling ----
FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/rail-cut-calculator/dist/public ./artifacts/rail-cut-calculator/dist/public

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
