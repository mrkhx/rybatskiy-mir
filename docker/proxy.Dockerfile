# syntax=docker/dockerfile:1

FROM nginx:1.27-alpine
RUN apk add --no-cache wget \
  && mkdir -p /var/www/certbot /etc/nginx/snippets /etc/nginx/templates
COPY docker/nginx/00-map.conf /etc/nginx/conf.d/00-map.conf
COPY docker/nginx/snippets/ /etc/nginx/snippets/
COPY docker/nginx/http.conf /etc/nginx/templates/http.conf
COPY docker/nginx/https.conf /etc/nginx/templates/https.conf
COPY docker/nginx/docker-entrypoint.sh /docker-entrypoint.d/99-select-tls.sh
RUN chmod +x /docker-entrypoint.d/99-select-tls.sh
# Stock nginx image runs /docker-entrypoint.d/*.sh then nginx.
# 99-select-tls.sh writes conf.d/default.conf (HTTP or HTTPS).
EXPOSE 80 443
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/health/live >/dev/null || exit 1
