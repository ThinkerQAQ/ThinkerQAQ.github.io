---
title: "3.2 Serving a File Directory with Nginx"
description: "Using autoindex for simple directory browsing, with security notes about exposed paths, permissions, and access controls."
translationOf: "web-server-nginx/file-server"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. Directory Configuration

The main configuration can include site-specific files:

```nginx
http {
    include /etc/nginx/conf.d/*.conf;
}
```

Example `/etc/nginx/conf.d/files.conf`:

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

- `autoindex on`: list directory entries when no index file exists;
- `autoindex_exact_size off`: show human-readable file sizes;
- `autoindex_localtime on`: display local time.

## 2. Security Notes

`autoindex` exposes filenames and directory structure. Never point it at directories containing secrets, backups, keys, or logs.

For internal file access, combine network restrictions, Basic Auth, signed URLs, or application-level authorization as appropriate. Give the Nginx worker only the filesystem permissions it needs.

## 3. Validate

```bash
nginx -t
nginx -s reload
```
