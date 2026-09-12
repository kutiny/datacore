FROM registry.alexaguirre.com.ar/library/node:24-slim-pnpm AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends libatomic1 python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM registry.alexaguirre.com.ar/library/node:24-slim-pnpm

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3737
CMD ["node", "src/index.js"]
