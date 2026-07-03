FROM nginx:alpine
COPY . /usr/share/nginx/html
CMD ["sh", "-c", "sed -i 's/listen  80;/listen '\"$PORT\"';/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
