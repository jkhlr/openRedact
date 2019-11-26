FROM nginx:1.16-alpine

WORKDIR /etc/nginx/conf.d
COPY nginx.conf default.conf
COPY src/* /usr/share/nginx/html/
