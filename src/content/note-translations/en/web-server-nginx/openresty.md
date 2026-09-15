---
title: "1.2 OpenResty"
description: "OpenResty installation, Lua basics, and ngx HTTP APIs."
translationOf: "web-server-nginx/openresty"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "nginx"
topicLabel: "1.Nginx"
order: 2
tags: ["Nginx"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What It Is
OpenResty bundles Nginx with LuaJIT and a set of Nginx/Lua modules, allowing request processing logic to access services such as HTTP, Redis, and databases through Lua libraries.

## 2. Installation
- [OpenResty - Installation](https://openresty.org/en/installation.html)

### 2.1. Common Lua Components
- [OpenResty Components](https://openresty.org/en/components.html)

## 3. Lua Basics
Review Lua syntax and data structures before using the Nginx Lua API.

## 4. OpenResty Packages
### 4.1. HTTP
- Query/form parameters

```lua
local args = ngx.req.get_uri_args()
for k, v in pairs(args) do
    ngx.say("[GET] key:", k, " value:", v)
end

ngx.req.read_body()
local post_args = ngx.req.get_post_args()
for k, v in pairs(post_args) do
    ngx.say("[POST] key:", k, " value:", v)
end
```

- Request headers

```lua
local headers = ngx.req.get_headers()
for k, v in pairs(headers) do
    ngx.say("[header] name:", k, " value:", v)
end
```

- Request body

```lua
ngx.req.read_body()
local data = ngx.req.get_body_data()
if data then
    ngx.say(data)
else
    local file = ngx.req.get_body_file()
    -- Large request bodies may be stored in a temporary file.
end
```

## 5. References
- [OpenResty Documentation](https://openresty.org/en/)
