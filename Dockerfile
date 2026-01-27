# Build stage - build the React frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - Node.js server with managed identity support
FROM node:20-alpine AS production

WORKDIR /app

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server/package*.json ./server/
COPY server/index.js ./server/

# Install backend dependencies
WORKDIR /app/server
RUN npm install --omit=dev

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80

# Expose port 80
EXPOSE 80

# Start the Node.js server
CMD ["node", "index.js"]
