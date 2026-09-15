---
title: "1.3 File Server"
description: "A simple Nginx file server using autoindex."
translationOf: "web-server-nginx/file-server"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "nginx"
topicLabel: "1.Nginx"
order: 3
tags: ["Nginx"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. Configuration
The original note uses Nginx `autoindex` to expose a directory as a simple file server.

`/etc/nginx/nginx.conf`:

```nginx
http {
    # ...
    include /etc/nginx/conf.d/*.conf;
    # ...
}
```

`/etc/nginx/conf.d/cdn.conf`:

```nginx
autoindex on;             # enable directory index
autoindex_exact_size off; # show human-readable approximate sizes
autoindex_localtime on;   # display local time
charset utf-8;

server {
    listen 9999;
    root $HOME/share;
    error_log $HOME/share/log/error.log;

    location / {
    }
}
```

Do not expose private directories with `autoindex` on an untrusted network unless access control and file permissions are intentionally configured.

## 2. References
- [ngx_http_autoindex_module](https://nginx.org/en/docs/http/ngx_http_autoindex_module.html)
