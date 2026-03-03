FROM node:22-alpine AS base

# ─── Build Client ────────────────────────────────────────────────────────
FROM base AS client-build
WORKDIR /app/client
COPY .npmrc ./
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ .
COPY shared/ ../shared/
RUN npx vite build

# ─── Build Server ────────────────────────────────────────────────────────
FROM base AS server-build
WORKDIR /app/server
COPY .npmrc ./
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ .
COPY shared/ ../shared/
RUN npm run build

# ─── Production ──────────────────────────────────────────────────────────
FROM base AS production
WORKDIR /app

# Copy server build results
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/package.json ./server/package.json
COPY --from=server-build /app/server/node_modules ./server/node_modules

# Copy client static build
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Railway starts in /app/server usually if we set it as WORKDIR
# or we can specify the path relative to /app
WORKDIR /app/server
CMD ["node", "dist/index.js"]
