FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./
COPY src/maps.js src/layouts.js src/geometry.js src/simulation.js ./src/
USER node
EXPOSE 3001
CMD ["node", "server.js"]
