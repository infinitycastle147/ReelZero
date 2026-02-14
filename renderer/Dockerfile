# ReelZero Renderer Microservice
# Build context: monorepo root (dockerContext: .)
# This allows COPY of both renderer/ and src/ (for sync-files.sh)

FROM node:20-slim

# Install FFmpeg, Chromium, and Noto fonts for rendering
# --no-install-recommends keeps image size smaller
RUN apt-get update && \
    apt-get install -y \
      ffmpeg \
      chromium \
      fonts-noto \
      --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Point Remotion/Puppeteer to the system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Skip Puppeteer's own Chromium download (we use the system one above)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copy package manifests first for layer caching
COPY renderer/package*.json ./

# Install ALL dependencies (including devDeps) for the TypeScript build
RUN npm ci

# Copy renderer source
COPY renderer/src ./src
COPY renderer/tsconfig.json ./tsconfig.json

# Build TypeScript → dist/
RUN npm run build

# Remove devDependencies after build to keep image lean
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/index.js"]
