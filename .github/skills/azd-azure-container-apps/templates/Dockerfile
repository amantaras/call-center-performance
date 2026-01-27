# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine AS production

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server/package.json ./server/
COPY server/index.js ./server/

# Install server dependencies
WORKDIR /app/server
RUN npm install --omit=dev

# Set working directory back to app root
WORKDIR /app

# Expose port 80 (Azure Container Apps default)
EXPOSE 80

# Set environment variable for port
ENV PORT=80

# Start the Node.js server
CMD ["node", "server/index.js"]
