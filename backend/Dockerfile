FROM node:20-alpine AS builder
WORKDIR /app

# OpenSSL needed for Prisma
RUN apk add --no-cache openssl openssl-dev

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Generate Prisma client with correct binary
COPY prisma ./prisma
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN npx prisma generate

# Build NestJS
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed; node dist/main"]
