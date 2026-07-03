FROM caddy:latest
COPY . /usr/share/caddy
EXPOSE 80
CMD ["caddy", "file-server", "--listen", ":80"]
