---
title: "1.4 Build from Source"
description: "Nginx source build, startup, build parameters, and directory layout."
translationOf: "web-server-nginx/build-from-source"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "nginx"
topicLabel: "1.Nginx"
order: 4
tags: ["Nginx"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. Build Steps
### 1.1. Download
- Nginx: [nginx download](https://nginx.org/en/download.html)

Nginx now distinguishes **mainline** and **stable** branches. Do not use the old “even version = stable, odd version = development” rule; follow the current release information on nginx.org.

- Other source dependencies

```bash
mkdir src
cd src

# Dependency versions change over time. Use currently supported releases
# from their official projects. Common dependencies include PCRE2, zlib,
# and OpenSSL.
#
# If Lua support is the goal, OpenResty is usually easier to maintain than
# manually combining old LuaJIT/lua-nginx-module releases.
```

### 1.2. Install the Development Environment
On a current Debian/Ubuntu-like system, a minimal example is:

```bash
sudo apt update
sudo apt install -y build-essential libpcre2-dev zlib1g-dev libssl-dev
```

Install additional development libraries only for modules you actually enable.

### 1.3. Configure, Build, and Install
A representative source build:

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

The original note enabled many optional/dynamic modules. Keep only the modules required by the actual deployment so the build is easier to maintain.

### 1.4. Start
```bash
$HOME/software/nginx/sbin/nginx -c $HOME/software/nginx/conf/nginx.conf
```

## 2. View the Parameters Used for the Build
```bash
nginx -V
```

## 3. Directory Layout
![](https://raw.githubusercontent.com/TDoct/images/master/1598181188_20200416171211741_28044.png)

The exact layout depends on the `./configure` paths selected during the build.

## 4. References
- [Building nginx from Sources](https://nginx.org/en/docs/configure.html)
- [OpenResty Installation](https://openresty.org/en/installation.html)
