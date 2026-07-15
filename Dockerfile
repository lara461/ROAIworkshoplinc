FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build the frontend ONCE, at image-build time.
# The Firebase config is NOT needed at build time anymore — it's served by
# the backend at runtime from env vars (see /api/firebase-config in
# server.ts), so no secret has to be baked into the JS bundle. This keeps
# cold starts fast and avoids Cloud Run startup-timeout issues.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
