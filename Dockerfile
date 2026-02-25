FROM node:22-alpine AS base

# ─── Build Client ────────────────────────────────────────────────────────
FROM base AS client-build
WORKDIR /app
COPY .npmrc ./
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ .
COPY shared/ ../shared/
RUN npx vite build

# ─── Build Server ────────────────────────────────────────────────────────
FROM base AS server-build
WORKDIR /app
COPY .npmrc ./
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ .
COPY shared/ ../shared/
RUN npx tsc

# ─── Production ──────────────────────────────────────────────────────────
FROM base AS production
WORKDIR /app

# Copy server build + production deps
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/package.json

# Copy client static build
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/server
CMD ["node", "dist/index.js"]
