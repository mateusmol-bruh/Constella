# syntax=docker/dockerfile:1
# Contexto de build: backend/. Fixe o digest verificado desta imagem no release.
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install --no-install-recommends -y openssl ca-certificates && apt-get clean

FROM base AS build
COPY package.json package-lock.json ./
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci
COPY prisma7.config.ts ./
COPY src/prisma ./src/prisma
# URL somente para carregar o config; generate não conecta nem migra o banco.
RUN DATABASE_URL=postgresql://build_only:build_only@127.0.0.1:5432/build_only npx prisma generate --config ./prisma7.config.ts
COPY scripts/check-runtime.cjs ./scripts/check-runtime.cjs

# Ferramentas para um job manual de migração, separado do processo web.
FROM build AS migration-tools
ENV NODE_ENV=production
USER node
CMD ["node", "scripts/check-runtime.cjs"]

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node package.json package-lock.json server.js ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts/check-runtime.cjs ./scripts/check-runtime.cjs
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/live',{signal:AbortSignal.timeout(2000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
# Recebe SIGTERM diretamente; o servidor fecha HTTP/Prisma de forma controlada.
CMD ["node", "server.js"]
