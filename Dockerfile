# ==========================================
# Frontend Build
# ==========================================
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ==========================================
# Backend Build
# ==========================================
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npx tsc

# ==========================================
# Production
# ==========================================
FROM node:20-alpine AS production
WORKDIR /app

# Install backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy backend build
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY backend/src/db/schema.sql ./backend/dist/db/

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 3001

# Start script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
