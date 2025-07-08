[toc]
 

## 1. 什么是Restful
- 基于HTTP协议的软件架构设计风格
- Resource Representational State Transfer


### 1.1. Resource
资源。使用URI定位资源

### 1.2. Representational
表现层。可以是txt、json等格式。
在HTTP请求的头信息中用Accept和Content-Type字段指定

### 1.3. State Transfer
状态转变。
GET用来获取资源，POST用来新建资源（也可以用于更新资源），PUT用来更新资源，DELETE用来删除资源
## 2. 为什么需要Restful
- 软件有架构，互联网是软件，所以互联网也有架构。而Restful就是互联网（HTTP）的架构模式
## 3. Restful的缺点
- 面向资源的编程思想只适合做 CRUD，面向过程、面向对象编程才能处理真正复杂的业务逻辑
- REST 与 HTTP 完全绑定，不适合应用于要求高性能传输的场景中
- REST 不利于事务支持
- REST 没有传输可靠性支持
- REST 缺乏对资源进行“部分”和“批量”的处理能力

## 4. 参考资源

- [理解RESTful架构 \- 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2011/09/restful.html)

