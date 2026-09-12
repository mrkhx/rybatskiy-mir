FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY admin/package.json admin/package.json
RUN npm ci --workspace=frontend --include-workspace-root --ignore-scripts
COPY frontend ./frontend
ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build --workspace=frontend

FROM nginx:1.27-alpine
RUN apk add --no-cache wget
COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
