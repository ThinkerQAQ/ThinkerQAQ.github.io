---
title: "3.1 静态内容、压缩与浏览器缓存"
description: "使用 Nginx 提供静态内容，并配置 sendfile、gzip、缓存头、CORS 与 Referer 防盗链。"
sourcePath: "Web_Server/Nginx/Nginx.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "serving-content"
topicLabel: "3.Serving Content"
order: 3
tags: ["Nginx", "Static Content", "HTTP Cache"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 静态内容

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

`root` 会把请求 URI 拼接到配置的根目录之后。静态文件场景下可以配合 `sendfile on;` 让内核更高效地传输文件。

## 2. gzip

```nginx
http {
    gzip on;
    gzip_comp_level 5;
    gzip_types text/plain text/css application/javascript application/json application/xml;
}
```

压缩适合文本类响应。图片、视频等已经压缩过的格式通常没有必要再次 gzip。

如果提前生成了 `.gz` 文件，并且构建时启用了 gzip static 模块，可以使用：

```nginx
gzip_static on;
```

## 3. 浏览器缓存

Nginx 可以生成 `Last-Modified`、ETag 等验证信息。对于带版本号或内容哈希的静态资源，还可以设置较长的强缓存时间：

```nginx
location ~* \.(css|js|png|jpg|svg|woff2)$ {
    expires 7d;
}
```

`expires` 会影响 `Expires` 和 `Cache-Control`。是否采用长缓存，应根据资源是否可安全地版本化决定。

## 4. CORS

CORS 是浏览器安全策略的一部分。Nginx 可以添加相关响应头，例如：

```nginx
location /assets/ {
    add_header Access-Control-Allow-Origin "https://app.example.com" always;
}
```

对需要凭证的跨域请求，不应使用 `Access-Control-Allow-Origin: *`。复杂请求还需要正确处理 OPTIONS 预检和允许的 Headers/Methods。

## 5. Referer 防盗链

```nginx
location ~* \.(jpg|png|gif)$ {
    valid_referers none blocked server_names *.example.com;
    if ($invalid_referer) {
        return 403;
    }
}
```

Referer 可以缺失或被伪造，所以这种方式只能降低普通盗链流量，不能作为强安全边界。需要更强控制时应使用签名 URL 或应用层授权。
