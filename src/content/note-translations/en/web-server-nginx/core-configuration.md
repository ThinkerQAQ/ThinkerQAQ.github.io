---
title: "2.1 Core Nginx Configuration"
description: "Common Nginx runtime configuration: logging, status, connection/request limits, IP access control, Basic Auth, and secure_link."
translationOf: "web-server-nginx/core-configuration"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. Logging

Error logs are commonly configured globally or at the `http` level, while access logs can use a custom `log_format`.

```nginx
error_log /var/log/nginx/error.log warn;

http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
}
```

`X-Forwarded-For` is only a request header. Treat it as client identity only when the proxy chain is trusted and configured accordingly.

## 2. Status Endpoint

When the `stub_status` module is available:

```nginx
location = /nginx_status {
    stub_status;
    allow 127.0.0.1;
    deny all;
}
```

Do not expose operational status endpoints publicly without access controls.

## 3. Connection Limits

```nginx
limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

server {
    location / {
        limit_conn conn_per_ip 20;
    }
}
```

Connection count and request count are not equivalent, especially with multiplexed protocols such as HTTP/2 and HTTP/3.

## 4. Request Rate Limits

```nginx
limit_req_zone $binary_remote_addr zone=req_per_ip:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=req_per_ip burst=20 nodelay;
    }
}
```

`burst` absorbs short request spikes while the configured rate controls the sustained flow.

## 5. IP Access Control

```nginx
location /admin/ {
    allow 10.0.0.0/8;
    deny all;
}
```

Behind trusted proxies, configure the Real IP module and explicit trusted proxy addresses before relying on the reconstructed client address.

## 6. Basic Auth

```nginx
location /internal/ {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

Basic Auth is useful for simple internal protection and should be used over HTTPS.

## 7. secure_link

`secure_link` can implement signed, expiring URLs for downloads or anti-hotlinking. It is not a replacement for a complete authentication and authorization system.
