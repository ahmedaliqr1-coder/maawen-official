FROM caddy:latest
COPY . /usr/share/caddy
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "caddy file-server --listen :$PORT"]
