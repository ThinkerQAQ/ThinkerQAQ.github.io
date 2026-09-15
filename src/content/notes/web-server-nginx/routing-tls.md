---
title: "5.1 Location、Rewrite、文件映射与 HTTPS"
description: "Nginx 请求路由笔记：location 匹配、rewrite、root/alias、try_files、真实 IP、常见网关错误与现代 HTTPS 配置。"
sourcePath: "Web_Server/Nginx/Nginx.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "routing-security"
topicLabel: "5.Routing & TLS"
order: 5
tags: ["Nginx", "Routing", "TLS"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. location 匹配

常见形式：

```nginx
location = /health { }
location ^~ /static/ { }
location ~ \.php$ { }
location ~* \.(jpg|png)$ { }
location / { }
```

简化理解：

1. 先检查精确匹配 `=`；
2. 找到最长前缀匹配；
3. 如果最长前缀带 `^~`，直接使用它；
4. 否则按配置顺序检查正则 location，使用第一个匹配项；
5. 没有正则匹配时使用此前记住的最长前缀。

## 2. rewrite

```nginx
rewrite ^/old/(.*)$ /new/$1 permanent;
```

常见 flag：

- `redirect`：302 临时重定向；
- `permanent`：301 永久重定向；
- `last`：停止当前 rewrite 指令并基于新 URI 重新执行 location 查找；
- `break`：停止当前 rewrite 指令，不发起新的 location 查找。

能使用 `return` 或 `try_files` 解决的问题，通常不需要复杂 rewrite。

## 3. root 与 alias

```nginx
location /images/ {
    root /srv/www;
}
```

请求 `/images/a.png` 会映射到 `/srv/www/images/a.png`。

```nginx
location /images/ {
    alias /srv/pictures/;
}
```

同一请求会映射到 `/srv/pictures/a.png`。使用 `alias` 时应特别注意 URI 前缀和目录末尾的 `/`。

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

Nginx 会按顺序检查文件/目录，均不存在时进入命名 location。

## 5. 真实客户端 IP

经过多层代理后，`$remote_addr` 默认是直接连接 Nginx 的上一跳地址。只有在前置代理可信时，才应配置 `set_real_ip_from`、`real_ip_header` 等规则恢复客户端地址。客户端自己提供的转发头不能直接视为可信。

## 6. HTTPS

现代 Nginx 使用 `listen` 指令的 `ssl` 参数：

```nginx
server {
    listen 443 ssl;
    server_name www.example.com;

    ssl_certificate /etc/nginx/tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
}
```

旧的独立 `ssl` 指令已经被移除，不应继续使用。生产环境应使用受信任 CA 签发的证书并限制私钥文件权限。

本地实验可以使用自签名证书，例如：

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout local.key -out local.crt -days 365 \
  -subj "/CN=localhost"
```

## 7. 常见网关错误

- **413 Request Entity Too Large**：常见于请求体超过 `client_max_body_size`；
- **502 Bad Gateway**：Nginx 无法从上游获得有效响应；
- **504 Gateway Timeout**：等待上游响应超时。

错误码只描述结果，仍需结合 Nginx error log 和上游日志定位根因。
