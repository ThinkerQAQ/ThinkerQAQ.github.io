[toc]
## 1. 什么是分布式Session
session是服务端的内存
分布式环境（多态机器）共享的session
## 2. 为什么需要分布式Session
在分布式环境之下，如果仍然使用传统的Tomcat的session机制，那么会发生以下现象：用户在A系统登录后，需要跳转到B系统进行某些操作，问题在于此时用户的登录信息都保存在A系统中，在B系统中并没有相关session，此时B系统会要求用户重新登录。

## 3. 如何实现分布式Session
### 3.1. session复制的功能
这种方式的缺点在于集群中机器数量过多时会频繁的在网络中传递session数据，对网络压力大。
### 3.2. 单点登录系统
也就是把整个系统中注册、登录等跟用户信息相关的请求都发送到固定的一个子系统sso中，sso再生成一个随机数作为token返回给客户端，通过这个token来标识是哪个用户的请求

#### 3.2.1. 具体实现
sso系统中的session功能是通过redis数据库来实现的。
生成一个随机数作为key，然后把用户信息序列化为json存到redis中。需要获取用户信息的时候通过该key向redis中取即可。
session实效时间设置为30分钟

## 4. 参考
[Spring Data Redis](https://spring.io/projects/spring-data-redis)