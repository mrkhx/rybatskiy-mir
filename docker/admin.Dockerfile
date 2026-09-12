FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY admin/package.json admin/package.json
RUN npm ci --workspace=admin --include-workspace-root --ignore-scripts
COPY admin ./admin
ARG VITE_ADMIN_API_URL=http://localhost:3000
ENV VITE_ADMIN_API_URL=$VITE_ADMIN_API_URL
RUN npm run build --workspace=admin

FROM nginx:1.27-alpine
RUN apk add --no-cache wget
COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/dist /usr/share/nginx/html
EXPOSE 80
