---
title: "4.1 Reverse Proxy, Load Balancing, and Caching"
description: "Nginx proxying with proxy_pass, upstream load balancing, proxy caching, forwarding headers, and static/dynamic request separation."
translationOf: "web-server-nginx/reverse-proxy"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. Reverse Proxy

A reverse proxy hides backend services behind Nginx:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Whether `proxy_pass` contains a URI changes how Nginx constructs the upstream request path, so URI mapping should be tested explicitly.

The historical note also used Nginx as a generic forward proxy. Standard Nginx is primarily an HTTP reverse proxy and does not provide a complete general-purpose HTTPS CONNECT forward proxy by default, so that pattern is no longer presented as a normal use case.

## 2. upstream and Load Balancing

```nginx
upstream app_backend {
    server 127.0.0.1:8080 weight=2;
    server 127.0.0.1:8081;
}

server {
    location / {
        proxy_pass http://app_backend;
    }
}
```

Round robin is the default. Other options include weights, `ip_hash`, `hash`, and failure-related parameters. Choose a strategy based on the actual traffic model rather than adding complexity for its own sake.

## 3. Proxy Cache

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:20m inactive=60m;

server {
    location /public-api/ {
        proxy_pass http://app_backend;
        proxy_cache app_cache;
        proxy_cache_valid 200 10m;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

Only cache responses that are safe to reuse. Authenticated, personalized, or authorization-sensitive responses generally require explicit bypass rules and a carefully designed cache key.

## 4. Static/Dynamic Separation

A common architecture lets Nginx serve static assets while proxying APIs or dynamic content to applications. Modern systems typically separate these paths by routing conventions rather than language-specific suffixes such as JSP.

## 5. Timeouts and Failures

Connection, send, and read timeouts cover different phases. Values should reflect service latency objectives rather than copied constants.
