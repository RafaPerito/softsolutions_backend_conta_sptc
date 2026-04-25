# Etapa 1 - Build
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install

COPY . .

RUN npm run build
RUN npm prune --production

# Etapa 2 - Produção
FROM node:18

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/src/main.js"]