## 1. 什么是API网关
- 网关=路由器+过滤器
    - 路由器：外部请求的入口（单点入口）。一般微服务都是部署在内网，所有外部请求都先经过网关，由网关转发到后端服务器（服务路由）。
    - 过滤器：限流熔断、安全认证、日志监控等

## 2. 为什么要需要API网关
- 抽取公共逻辑
    - 像授权认证的代码在每个服务中都得写一套。有了网关后，授权认证这类横切功能都可以写在网关中
- 统一不同客户端的入口，避免形成网状结构
    - 如果没有网关，客户端直连每个微服务
## 3. 如何实现API网关

### 3.1. 如何转发请求
- 配合注册中心
- ![网关](https://raw.githubusercontent.com/TDoct/images/master/1624795561_20210627200556375_16067.png =500x)

### 3.2. 如何过滤请求
- 责任链
### 3.3. IO模型
- 如果后端服务是CPU密集型，那么使用同步阻塞即可
- 如果后端服务是IO密集型，那么使用异步或者IO多路复用
- [IO模型.md](../../Operating_System/Linux/IO/IO模型.md)
## 4. API网关组件

### 4.1. Spring Cloud Zuul
[Zuul.md](../../Java/Framework/Spring_Cloud/Zuul/Zuul.md)
### 4.2. Spring Cloud Gateway
[Gateway.md](../../Java/Framework/Spring_Cloud/Gateway/Gateway.md)
### 4.3. Tyk
### 4.4. Kong
## 5. 模式
### 5.1. BFF
![网关-BFF模式](https://raw.githubusercontent.com/TDoct/images/master/1647920441_20220322114037926_229.png)

### 5.2. 网关聚合模式
![网关-网关聚合模式](https://raw.githubusercontent.com/TDoct/images/master/1648009621_20220323122658246_2396.png)

## 6. 参考
- [开放API网关实践\(一\) ——设计一个API网关](https://juejin.cn/post/6844903906896510989#heading-16)
- [开放API网关实践\(二\) —— 重放攻击及防御](https://juejin.cn/post/6844903910516195341)
- [开放API网关实践\(三\) —— 限流](https://juejin.cn/post/6844903924235763719)
- [微服务架构之「 API网关 」 \- 不止思考 \- 博客园](https://www.cnblogs.com/jsjwk/p/10769246.html)