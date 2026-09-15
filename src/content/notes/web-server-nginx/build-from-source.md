---
title: "8.1 从源码构建 Nginx"
description: "现代化的 Nginx 源码构建笔记：何时需要源码编译、常见依赖、configure 选项、构建验证，以及与 OpenResty 的边界。"
sourcePath: "Web_Server/Nginx/编译安装.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "installation"
topicLabel: "8.Installation"
order: 9
tags: ["Nginx", "Build", "Installation"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 是否需要源码构建

普通服务器优先使用发行版或 Nginx 官方二进制包，它们更容易获得安全更新。源码构建主要适用于：

- 需要特定编译选项；
- 需要静态或动态第三方模块；
- 需要调试构建；
- 需要控制依赖版本或安装路径。

历史笔记中“偶数版本稳定、奇数版本不稳定”的说法不适合作为今天的选择规则。Nginx 官方直接维护 **stable** 和 **mainline** 分支，应以官方 download 页面和变更记录判断。

## 2. 依赖

常见功能可能需要：

- PCRE/PCRE2：正则表达式；
- zlib：gzip；
- OpenSSL：HTTPS/TLS；
- 其他模块各自需要的开发库。

不要继续固定使用多年前的 PCRE、zlib、OpenSSL 版本范围。应从当前 Nginx 文档和操作系统安全支持版本选择依赖。

## 3. 一个最小源码构建示例

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

需要额外模块时，再使用 `--add-module=PATH` 或 `--add-dynamic-module=PATH`。不要一开始就启用大量自己不使用的模块。

## 4. 使用依赖源码

Nginx 的 configure 支持通过 `--with-pcre=PATH`、`--with-zlib=PATH`、`--with-openssl=PATH` 指定依赖源码。只有在确实需要自行控制依赖时才这样做；一般使用系统或官方包更容易维护。

## 5. 验证

```bash
/opt/nginx/sbin/nginx -V
/opt/nginx/sbin/nginx -t
```

`nginx -V` 可以查看编译参数和依赖信息，`nginx -t` 用于校验配置。

## 6. Lua / OpenResty

如果目标是把 Lua 深度集成到 Nginx，优先使用 OpenResty。OpenResty 已经组合并维护 LuaJIT、lua-nginx-module 和相关组件，通常比手工拼接旧版本模块更可靠。
