---
title: "1.2 OpenResty"
description: "OpenResty 安装、Lua 入门与 ngx HTTP API。"
sourcePath: "Web_Server/Nginx/openresty.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "nginx"
topicLabel: "1.Nginx"
order: 2
tags: ["Nginx"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 是什么
用Lua增强的Nginx，可以用Lua访问MySQL、Redis、HTTP等

## 2. 安装
- [OpenResty \- 安装](https://openresty.org/cn/installation.html)
- [Lua: download](https://www.lua.org/download.html)
### 2.1. 常用Lua组件
- [OpenResty \- Components](https://openresty.org/cn/components.html)

## 3. Lua入门
Lua.md

## 4. openresty包
### 4.1. HTTP
- 请求行

```lua
-- 获取get请求参数
local arg=ngx.req.get_uri_args()
for k,v in pairs(arg) do
    ngx.say("[GET] key:",k," v:",v)
    ngx.say("换行符")
end

-- 获取post请求时，请求参数
ngx.req.read_body() -- 解析body参数之前一定要先读取body
local arg = ngx.req.get_post_args()
for k,v in pairs(arg) do
    ngx.say("[POST] key:",k," v:",v)
    ngx.say("<br>")
end
```

- 请求头

```lua
-- 获取header
local headers = ngx.req.get_headers()
for k,v in pairs(headers) do
    ngx.say("[header] name;",k," v:",v)
    ngx.say("<br>")
end
```

- 请求体

```lua
--获取body信息
ngx.req.read_body()
local data = ngx.req.get_body_data()
ngx.say(data)
-- 请求体较大或写入临时文件时 get_body_data() 可能返回 nil，可按需要处理 get_body_file()。
```

## 5. 参考
- [OpenResty高性能亿万级商品详情页（附：入门视频） \- 简书](https://www.jianshu.com/p/76c2bd211571)
