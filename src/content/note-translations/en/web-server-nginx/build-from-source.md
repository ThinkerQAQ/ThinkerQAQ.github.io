---
title: "8.1 Building Nginx from Source"
description: "A modern source-build note: when source compilation is justified, common dependencies, configure options, validation, and the boundary with OpenResty."
translationOf: "web-server-nginx/build-from-source"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. Do You Need a Source Build?

For ordinary servers, prefer distribution packages or official Nginx binary packages because security updates are easier to maintain. Source builds mainly make sense when you need:

- specific compile-time options;
- static or dynamic third-party modules;
- debug builds;
- explicit control over dependencies or install paths.

The historical “even versions are stable, odd versions are unstable” rule is not a good modern selection rule. Nginx explicitly maintains **stable** and **mainline** branches; use the official download page and changelogs.

## 2. Dependencies

Common features may require:

- PCRE/PCRE2 for regular expressions;
- zlib for gzip;
- OpenSSL for HTTPS/TLS;
- development libraries required by optional modules.

Do not pin the very old PCRE, zlib, and OpenSSL ranges from the historical note. Select supported versions based on current Nginx documentation and the operating system's security support.

## 3. Minimal Source-Build Example

```bash
tar -xzf nginx-VERSION.tar.gz
cd nginx-VERSION

./configure \
  --prefix=/opt/nginx \
  --with-http_ssl_module \
  --with-http_v2_module \
  --with-http_stub_status_module \
  --with-threads

make -j"$(nproc)"
sudo make install
```

Enable additional modules only when they are actually needed, using options such as `--add-module=PATH` or `--add-dynamic-module=PATH`.

## 4. Building Dependency Sources

Nginx configure can point to dependency source trees with `--with-pcre=PATH`, `--with-zlib=PATH`, and `--with-openssl=PATH`. Use this only when dependency control is necessary; system or official packages are normally easier to maintain.

## 5. Validate

```bash
/opt/nginx/sbin/nginx -V
/opt/nginx/sbin/nginx -t
```

`nginx -V` shows build options and dependency information. `nginx -t` validates the configuration.

## 6. Lua and OpenResty

If deep Lua integration is the goal, prefer OpenResty. It maintains LuaJIT, lua-nginx-module, and related components as a compatible distribution instead of requiring manual assembly of old module releases.
