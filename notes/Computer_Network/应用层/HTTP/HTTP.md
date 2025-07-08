## 1. HTTP报文格式
### 1.1. 请求


- 请求行
- 请求头
- 空行
- 请求体


### 1.2. 响应

- 状态行
- 响应头
- 空行
- 响应体
## 2. URL
[URL编码.md](URL编码.md)
## 3. HTTP方法
[HTTP方法.md](HTTP方法.md)
## 4. HTTP状态码
[HTTP状态码.md](HTTP状态码.md)
## 5. HTTP版本
[HTTP版本.md](HTTP版本.md)
## 6. HTTP跨域
[浏览器同源策略以及跨域.md](浏览器同源策略以及跨域.md)
## 7. HTTP缓存
[HTTP缓存.md](HTTP缓存.md)
## 8. HTTP长链接
[HTTP KeepAlive.md](HTTP%20KeepAlive.md)

## 9. HTTP服务器推送
### 9.1. 客户端定期轮询
- 客户端每5s向服务器发送一个HTTP请求，服务器如果有新消息，就返回
- 优点：
    - 实现简单
    - 消息不会丢失
- 缺点：
    - 消息不及时
    - 不停得打开关闭链接耗费资源
### 9.2. WebSocket
- [WebSocket.md](WebSocket.md)
- 优点：
    - 消息及时
- 缺点：
    - 消息可能丢失
### 9.3. HTTP长轮询
- 客户端发送一个HTTP请求，如果服务器有新消息，就立即返回；如果没有，则服务器夯住此连接，客户端一直等该请求返回
- 优点：
    - 消息及时
- 缺点：
    - 需要维持连接耗费服务器资源
## 10. cookie session
[cookie和session.md](cookie和session.md)
## 11. HTTPS
[HTTPS.md](HTTPS.md)
## 12. Restful
[Restful.md](Restful.md)

## 13. 抓包工具
## 14. Fiddler
[Fiddler.md](Fiddler/Fiddler.md)