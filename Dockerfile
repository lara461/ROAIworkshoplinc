FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build the React frontend
RUN npm run build

# Run in production mode
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# tsx runs TypeScript directly — no separate compile step needed for the server
CMD ["npx", "tsx", "server.ts"]
