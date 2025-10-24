# syntax=docker/dockerfile:1.7

## Stage 1: install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci

## Stage 2: build the Next.js app
FROM node:22-alpine AS builder
WORKDIR /app/web
COPY --from=deps /app/web/node_modules ./node_modules
COPY web/ .
RUN npm run build

## Stage 3: production runtime
FROM node:22-alpine AS runner
WORKDIR /app/web
ENV NODE_ENV=production
COPY --from=builder /app/web ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["npm", "run", "start"]
