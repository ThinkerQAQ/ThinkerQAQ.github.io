---
title: "1.4 编译安装"
description: "Nginx 源码编译安装、启动、参数与目录。"
sourcePath: "Web_Server/Nginx/编译安装.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "nginx"
topicLabel: "1.Nginx"
order: 4
tags: ["Nginx"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 搭建步骤

### 1.1. 下载
- Nginx
[nginx: download](http://nginx.org/en/download.html)
Nginx 官方区分 mainline 与 stable 分支，不再使用“偶数稳定、奇数开发”作为判断规则；下载时以官网当前发布说明为准。

- 其他依赖的源码

```bash
mkdir src
cd src

# 依赖版本变化较快，请从各项目官网获取当前受支持版本。
# 常见依赖包括 PCRE2、zlib、OpenSSL。
# 如果目标是使用 Lua，通常更推荐直接使用 OpenResty，避免手工组合过旧的 LuaJIT/模块版本。
```

### 1.2. 安装开发环境

```bash
sudo apt update
sudo apt install -y build-essential libpcre2-dev zlib1g-dev libssl-dev
```

### 1.3. 编译安装

```bash
./configure --prefix="$HOME/software/nginx" \
            --with-threads \
            --with-file-aio \
            --with-http_ssl_module \
            --with-http_v2_module \
            --with-http_realip_module \
            --with-http_gzip_static_module \
            --with-http_auth_request_module \
            --with-http_secure_link_module \
            --with-http_stub_status_module \
            --with-stream \
            --with-stream_ssl_module \
            --with-debug

make -j"$(nproc)"
make install
```

### 1.4. 启动

```bash
$HOME/software/nginx/sbin/nginx -c $HOME/software/nginx/conf/nginx.conf
```

## 2. 查看安装时所选用的参数

```bash
nginx -V
```

## 3. 目录介绍
![](https://raw.githubusercontent.com/TDoct/images/master/1598181188_20200416171211741_28044.png)

## 4. 参考
- [How to Compile Nginx From Source on Ubuntu 16\.04 \- Vultr\.com](https://www.vultr.com/docs/how-to-compile-nginx-from-source-on-ubuntu-16-04)
- [Nginx安装lua\-nginx\-module模块\_运维\_拼搏的小船长\-CSDN博客](https://blog.csdn.net/qq_25551295/article/details/51744815)
- [Nginx编译安装Lua模块\_慕课手记](https://www.imooc.com/article/19597)
