FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN npm ci

FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build --workspace @consultoria/domain
RUN npm run build --workspace @consultoria/api
RUN mkdir -p apps/api/dist/database/migrations \
  && cp apps/api/src/database/migrations/*.sql apps/api/dist/database/migrations/

FROM node:22-alpine AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/var/lib/consultoria/consultoria.sqlite
ENV SQLITE_BACKUP_DIR=/var/backups/consultoria

RUN mkdir -p /var/lib/consultoria /var/backups/consultoria \
  && chown -R node:node /var/lib/consultoria /var/backups/consultoria

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node apps/api/package.json apps/api/package.json
COPY --chown=node:node packages/domain/package.json packages/domain/package.json
COPY --chown=node:node --from=production-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=build /app/packages/domain/dist ./packages/domain/dist

WORKDIR /app/apps/api

USER node

EXPOSE 3000
VOLUME ["/var/lib/consultoria", "/var/backups/consultoria"]
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 3000}/health`).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "--import", "tsx", "dist/server.js"]
