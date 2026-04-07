FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl openssl-dev

COPY package.json ./
RUN npm install

COPY prisma ./prisma
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx prisma db seed; node dist/main"]
