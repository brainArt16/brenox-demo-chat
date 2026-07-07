FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_BRENOX_API_URL=https://api.breno-x.com
ARG VITE_DEMO_API_URL=
ARG VITE_APP_BASE_PATH=/

ENV VITE_BRENOX_API_URL=$VITE_BRENOX_API_URL
ENV VITE_DEMO_API_URL=$VITE_DEMO_API_URL
ENV VITE_APP_BASE_PATH=$VITE_APP_BASE_PATH

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server ./server

EXPOSE 8080

CMD ["node", "server/index.mjs"]
