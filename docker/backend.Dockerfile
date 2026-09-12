# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY admin/package.json admin/package.json
RUN npm ci --workspace=backend --include-workspace-root --ignore-scripts

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY backend ./backend
RUN npm run prisma:generate --workspace=backend
RUN npm run build --workspace=backend

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY admin/package.json admin/package.json
RUN npm ci --workspace=backend --include-workspace-root --omit=dev --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl wget \
  && addgroup -S app \
  && adduser -S app -G app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=app:app /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/backend/package.json ./backend/package.json
COPY --from=build --chown=app:app /app/backend/dist ./backend/dist
COPY --from=build --chown=app:app /app/backend/prisma ./backend/prisma
WORKDIR /app/backend
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health/live >/dev/null || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
