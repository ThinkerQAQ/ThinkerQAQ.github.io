---
title: "1.3 文件服务器"
description: "使用 Nginx autoindex 搭建简单文件服务器。"
sourcePath: "Web_Server/Nginx/文件服务器.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "nginx"
topicLabel: "1.Nginx"
order: 3
tags: ["Nginx"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 配置

- `/etc/nginx/nginx.conf`

```conf
http {
    # ...
    include /etc/nginx/conf.d/*.conf;
    # ...
}
```

- `/etc/nginx/conf.d/cdn.conf`

```nginx
autoindex on;             # 开启索引功能
autoindex_exact_size off; # 只显示大概大小
autoindex_localtime on;   # 显示本机时间而非 GMT 时间
charset utf-8;

server {
    listen 9999;
    root $HOME/share;
    error_log $HOME/share/log/error.log;

    location / {
    }

    error_page 404 /404.html;
    location = /40x.html {
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
    }
}
```

## 2. 参考
- [Nginx搭建简单文件服务器 /- 掘金](https://juejin.cn/post/7010651653648941070)
