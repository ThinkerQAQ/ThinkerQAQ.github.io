---
title: "5.1 Location, Rewrite, Filesystem Mapping, and HTTPS"
description: "Nginx routing notes covering location matching, rewrite, root/alias, try_files, real client IP, gateway errors, and modern HTTPS configuration."
translationOf: "web-server-nginx/routing-tls"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. location Matching

```nginx
location = /health { }
location ^~ /static/ { }
location ~ \.php$ { }
location ~* \.(jpg|png)$ { }
location / { }
```

A useful simplified model is:

1. check exact `=` matches;
2. remember the longest prefix match;
3. if that prefix uses `^~`, select it;
4. otherwise scan regex locations in configuration order and use the first match;
5. if no regex matches, use the remembered longest prefix.

## 2. rewrite

```nginx
rewrite ^/old/(.*)$ /new/$1 permanent;
```

Common flags:

- `redirect`: 302 temporary redirect;
- `permanent`: 301 permanent redirect;
- `last`: stop the current rewrite set and search locations again using the new URI;
- `break`: stop the current rewrite set without starting a new location search.

Prefer `return` or `try_files` when they solve the routing problem more directly.

## 3. root and alias

```nginx
location /images/ {
    root /srv/www;
}
```

`/images/a.png` maps to `/srv/www/images/a.png`.

```nginx
location /images/ {
    alias /srv/pictures/;
}
```

The same request maps to `/srv/pictures/a.png`. Be careful with URI prefixes and trailing slashes when using `alias`.

## 4. try_files

```nginx
location / {
    root /srv/app;
    try_files $uri $uri/ @backend;
}

location @backend {
    proxy_pass http://127.0.0.1:9090;
}
```

Nginx checks files/directories in order and falls back to the named location.

## 5. Real Client IP

Behind multiple proxies, `$remote_addr` is the directly connected peer. Only configure `set_real_ip_from` and `real_ip_header` when the preceding proxy is trusted. Client-supplied forwarding headers are not trustworthy by themselves.

## 6. HTTPS

Modern Nginx enables TLS on the listening socket:

```nginx
server {
    listen 443 ssl;
    server_name www.example.com;

    ssl_certificate /etc/nginx/tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
}
```

The old standalone `ssl` directive has been removed and should not be used. Production deployments should use a certificate from a trusted CA and restrict access to private keys.

For local experiments, a self-signed certificate is sufficient:

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout local.key -out local.crt -days 365 \
  -subj "/CN=localhost"
```

## 7. Common Gateway Errors

- **413**: request body commonly exceeds `client_max_body_size`;
- **502**: Nginx could not obtain a valid upstream response;
- **504**: upstream response timed out.

Use both the Nginx error log and upstream logs to determine the actual cause.
