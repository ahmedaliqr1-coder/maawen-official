FROM caddy:latest
COPY . /usr/share/caddy
EXPOSE 80
CMD ["sh", "-c", "caddy file-server --listen :$PORT"]
