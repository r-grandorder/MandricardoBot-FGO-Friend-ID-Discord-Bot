# Pinned to the Node version in .nvmrc. Alpine keeps the image small.
FROM node:18-alpine

WORKDIR /usr/src/bot

# better-sqlite3 (pulled in by quick.db) is a native module with no musl prebuilt,
# so it is compiled from source. python3 + build-base provide the toolchain; they
# are installed as a virtual package and removed afterwards to keep the image lean.
# npm ci installs exactly what package-lock.json pins, for reproducible builds.
COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build python3 build-base \
    && npm ci --omit=dev \
    && apk del .build

# Application source. Secrets (config/config.js) and runtime data (db/) are kept
# out by .dockerignore and must be mounted at run time; see docs/docker.md.
COPY . .

CMD ["node", "index.js"]
