---
title: "3.2 使用 Nginx 提供文件目录"
description: "使用 autoindex 快速提供文件目录浏览，并说明目录暴露、权限和日志方面的安全注意事项。"
sourcePath: "Web_Server/Nginx/文件服务器.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "serving-content"
topicLabel: "3.Serving Content"
order: 8
tags: ["Nginx", "File Server"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 配置文件目录

主配置可以包含单独的站点配置：

```nginx
http {
    include /etc/nginx/conf.d/*.conf;
}
```

例如 `/etc/nginx/conf.d/files.conf`：

```nginx
server {
    listen 9999;
    server_name _;

    root /srv/share;
    charset utf-8;

    location / {
        autoindex on;
        autoindex_exact_size off;
        autoindex_localtime on;
    }
}
```

- `autoindex on`：没有索引文件时列出目录内容；
- `autoindex_exact_size off`：使用更易读的文件大小；
- `autoindex_localtime on`：显示本地时间。

## 2. 安全注意事项

`autoindex` 会主动暴露目录中的文件名和层级，所以不要直接把包含私密文件、备份、密钥或日志的目录作为 root。

如果文件只给内部用户使用，应结合网络访问控制、Basic Auth、签名 URL 或应用层授权。

还应保证 Nginx worker 只拥有读取目标目录所需的最小权限。

## 3. 验证

修改配置后先执行：

```bash
nginx -t
nginx -s reload
```
