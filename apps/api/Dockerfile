# The API image.
#
# One stage on purpose. A slimmer image would mean pruning dev dependencies and
# then putting the Prisma CLI back so migrations can run at startup, which is more
# moving parts than a self-hosted tool of this size needs.
FROM node:24-alpine

WORKDIR /app

# Copy the manifests first so npm ci is cached until a dependency actually changes.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# --ignore-scripts: the postinstall generates the Prisma client, and the schema is
# not here yet. It is generated explicitly below.
RUN npm ci --ignore-scripts

COPY apps/api apps/api

RUN npm run db:generate -w @testbrain/api && npm run build -w @testbrain/api

WORKDIR /app/apps/api

EXPOSE 4000

# Migrations run at startup rather than as a separate job, so a self-hoster has one
# fewer thing to remember.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
