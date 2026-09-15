---
title: "7.1 OpenResty and Lua"
description: "OpenResty fundamentals: Nginx + LuaJIT, installation, and common APIs for request arguments, headers, and bodies."
translationOf: "web-server-nginx/openresty"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. What OpenResty Is

OpenResty combines Nginx, OpenResty's LuaJIT branch, `lua-nginx-module`, and many `lua-resty-*` libraries into a platform for web and gateway workloads.

Lua code runs inside Nginx's event model and can use nonblocking cosocket APIs to access HTTP, Redis, MySQL, and other services.

## 2. Installation

On modern Linux systems, prefer official OpenResty binary packages. Build from source only when build-time control is required.

For Lua integration, avoid manually combining very old LuaJIT, NginxDevelKit, and lua-nginx-module releases with stock Nginx. OpenResty maintains a compatible bundle.

## 3. GET Arguments

```lua
local args = ngx.req.get_uri_args()
for k, v in pairs(args) do
    ngx.say(k, ": ", v)
end
```

## 4. POST Form Arguments

```lua
ngx.req.read_body()
local args = ngx.req.get_post_args()
for k, v in pairs(args) do
    ngx.say(k, ": ", v)
end
```

## 5. Request Headers

```lua
local headers = ngx.req.get_headers()
ngx.say(headers["user-agent"] or "")
```

## 6. Request Body

```lua
ngx.req.read_body()
local data = ngx.req.get_body_data()
```

`ngx.req.get_body_data()` may return `nil` when the body is empty or when a larger body has been written to a temporary file. Code handling large bodies should also consider `ngx.req.get_body_file()`.

## 7. Design Principle

OpenResty is well suited to lightweight, nonblocking logic at the traffic edge. Blocking I/O, long CPU-bound work, and complex business workflows should live in backend services instead of occupying Nginx workers.
