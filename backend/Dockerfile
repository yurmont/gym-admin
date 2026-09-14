FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace @gym-admin/backend --include-workspace-root=false
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src
RUN npm run build --workspace @gym-admin/backend

FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace @gym-admin/backend --include-workspace-root=false --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist ./backend/dist
COPY backend/migrations ./backend/migrations
COPY backend/scripts ./backend/scripts
USER node
EXPOSE 8080
CMD ["node", "backend/dist/main.js"]
