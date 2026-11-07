FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/mystudy-planner/health || exit 1

CMD ["node", "server.js"]
