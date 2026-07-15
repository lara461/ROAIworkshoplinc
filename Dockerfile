FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# The frontend is built at container START, not at image build time.
# This is on purpose: the Firebase config (VITE_FIREBASE_*) is only
# available as an env var once Cloud Run starts the container, so Vite
# needs to run then in order to bake those values into the JS bundle.
# Adds a few seconds to cold start; fine for a workshop-scale tool.
CMD ["sh", "-c", "npm run build && npx tsx server.ts"]
