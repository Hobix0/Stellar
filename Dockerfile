# Stellar – Docker-Image (Frontend + Server in einem Container)
# Bauen:   docker build -t stellar .
# Starten: docker compose up -d   (siehe docker-compose.yml)

# --- 1. Bauen: Abhängigkeiten installieren, Frontend (Vite) und Server (tsc) kompilieren ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY client client
RUN npm run build

# --- 2. Laufzeit: nur Produktions-Abhängigkeiten des Servers + gebaute Dateien ---
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Europe/Berlin
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --workspace server && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/server/src/index.js"]
