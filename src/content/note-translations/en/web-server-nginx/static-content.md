---
title: "3.1 Static Content, Compression, and Browser Caching"
description: "Serving static content with Nginx, including sendfile, gzip, cache headers, CORS, and Referer-based anti-hotlinking."
translationOf: "web-server-nginx/static-content"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. Static Content

```nginx
server {
    listen 80;
    server_name example.test;
    root /srv/www;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

`root` appends the request URI to the configured filesystem root. `sendfile on;` can make static-file transfer more efficient.

## 2. gzip

```nginx
http {
    gzip on;
    gzip_comp_level 5;
    gzip_types text/plain text/css application/javascript application/json application/xml;
}
```

Compression is most useful for text-based responses. Already-compressed media formats usually do not benefit from gzip.

Precompressed `.gz` files can be served with `gzip_static on;` when that module is available.

## 3. Browser Caching

Nginx can emit validators such as `Last-Modified` and ETag. Versioned or content-hashed assets can also receive longer freshness lifetimes:

```nginx
location ~* \.(css|js|png|jpg|svg|woff2)$ {
    expires 7d;
}
```

Choose long-lived caching only when resources can be safely versioned.

## 4. CORS

```nginx
location /assets/ {
    add_header Access-Control-Allow-Origin "https://app.example.com" always;
}
```

Credentialed cross-origin requests must not use `Access-Control-Allow-Origin: *`. Complex requests also need correct OPTIONS preflight handling and allowed headers/methods.

## 5. Referer-Based Anti-Hotlinking

```nginx
location ~* \.(jpg|png|gif)$ {
    valid_referers none blocked server_names *.example.com;
    if ($invalid_referer) {
        return 403;
    }
}
```

Referer can be missing or forged, so this is only a lightweight traffic control. Signed URLs or application authorization provide stronger protection.
