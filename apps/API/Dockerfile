# Build context is the repo root (workspaces share one lockfile).
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm --workspace apps/api run build

FROM node:20-slim AS runtime
WORKDIR /app/apps/api
ENV NODE_ENV=production
# hoisted workspace deps live at /app/node_modules; Node resolves up the tree
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]
