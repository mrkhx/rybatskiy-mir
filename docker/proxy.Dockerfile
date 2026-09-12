# syntax=docker/dockerfile:1

FROM nginx:1.27-alpine
RUN apk add --no-cache wget
COPY docker/nginx/reverse-proxy.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/health/live >/dev/null || exit 1
