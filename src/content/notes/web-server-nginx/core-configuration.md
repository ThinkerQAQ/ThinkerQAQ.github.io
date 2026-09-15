---
title: "2.1 Nginx 核心配置"
description: "Nginx 常用运行配置：日志、状态、连接/请求限制、IP 访问控制、Basic Auth 与 secure_link。"
sourcePath: "Web_Server/Nginx/Nginx.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "configuration"
topicLabel: "2.Configuration"
order: 2
tags: ["Nginx", "Configuration"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 日志

错误日志通常放在全局或 `http` 级别，访问日志可以通过 `log_format` 自定义字段。

```nginx
error_log /var/log/nginx/error.log warn;

http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
}
```

日志中的 `X-Forwarded-For` 只是请求头，只有在信任并正确配置前置代理时才应把它用于真实客户端 IP 判断。

## 2. 状态页

如果构建时包含 `stub_status` 模块，可以暴露一个简单状态端点：

```nginx
location = /nginx_status {
    stub_status;
    allow 127.0.0.1;
    deny all;
}
```

状态端点不应直接暴露到公网。

## 3. 连接限制

```nginx
limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

server {
    location / {
        limit_conn conn_per_ip 20;
    }
}
```

`limit_conn` 限制并发连接数。对于 HTTP/2、HTTP/3 等多路复用协议，“连接”和“请求”的关系与 HTTP/1.1 不完全相同，因此通常还需要结合请求限流。

## 4. 请求速率限制

```nginx
limit_req_zone $binary_remote_addr zone=req_per_ip:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=req_per_ip burst=20 nodelay;
    }
}
```

`limit_req` 基于漏桶思想控制请求速率，`burst` 用于吸收短时间突发。

## 5. IP 访问控制

```nginx
location /admin/ {
    allow 10.0.0.0/8;
    deny all;
}
```

如果 Nginx 位于可信反向代理之后，应使用 Real IP 模块并明确配置可信代理地址，再使用修正后的客户端地址做访问控制。不能直接信任任意客户端提供的 `X-Forwarded-For`。

## 6. Basic Auth

```nginx
location /internal/ {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

Basic Auth 适合简单的内部访问保护。密码凭证会随请求发送，实际部署应配合 HTTPS。

## 7. secure_link

`secure_link` 可以用带签名和过期时间的 URL 控制资源访问，常见于下载链接、防盗链等场景。它不能替代完整的身份认证与授权系统。
