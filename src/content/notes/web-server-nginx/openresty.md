---
title: "7.1 OpenResty 与 Lua"
description: "OpenResty 基础笔记：Nginx + LuaJIT 的执行模型、安装方式，以及读取请求参数、Header 和 Body 的常用 API。"
sourcePath: "Web_Server/Nginx/openresty.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "extensibility"
topicLabel: "7.OpenResty"
order: 7
tags: ["OpenResty", "Nginx", "Lua"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. OpenResty 是什么

OpenResty 把 Nginx、OpenResty 维护的 LuaJIT 分支、`lua-nginx-module` 和大量 `lua-resty-*` 库组合成一个面向 Web 和网关场景的平台。

Lua 代码运行在 Nginx 的事件模型中，可以通过 cosocket 等非阻塞 API 访问 HTTP、Redis、MySQL 等服务。

## 2. 安装

现代 Linux 环境优先使用 OpenResty 官方二进制包。需要源码构建时再使用官方源码包和 `./configure`。

不建议为了 Lua 支持手工把非常旧的 LuaJIT、NginxDevelKit 和 lua-nginx-module 版本拼接到普通 Nginx；直接使用 OpenResty 更容易保持组件兼容。

## 3. GET 参数

```lua
local args = ngx.req.get_uri_args()
for k, v in pairs(args) do
    ngx.say(k, ": ", v)
end
```

## 4. POST 表单参数

```lua
ngx.req.read_body()
local args = ngx.req.get_post_args()
for k, v in pairs(args) do
    ngx.say(k, ": ", v)
end
```

## 5. 请求头

```lua
local headers = ngx.req.get_headers()
ngx.say(headers["user-agent"] or "")
```

## 6. 请求体

```lua
ngx.req.read_body()
local data = ngx.req.get_body_data()
```

`ngx.req.get_body_data()` 可能返回 `nil`：请求体可能为空，也可能因为体积较大被写入临时文件。需要处理大请求体时应同时考虑 `ngx.req.get_body_file()`，不能把 `nil` 一律理解为“没有请求体”。

## 7. 使用原则

OpenResty 适合在接入层执行轻量、非阻塞的请求处理逻辑。阻塞 I/O、长时间 CPU 计算或复杂业务流程会占用 worker，应放到更合适的后端服务中。
