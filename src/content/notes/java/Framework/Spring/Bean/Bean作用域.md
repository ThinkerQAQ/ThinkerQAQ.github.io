---
title: "2.29 Bean作用域"
description: "1. 作用域分类 - singleton：每次从容器中获取的bean是同一个 - prototype：每次从容器中获取的bean，都会创建一个新的 - request：在Http请求中使用的同一个bean - session：在http session中使用的是同一个bean 2. 为什么有prot"
sourcePath: "Java/Framework/Spring/Bean/Bean作用域.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 31
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-02-05T12:50:26Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 1. 作用域分类
-   singleton：每次从容器中获取的bean是同一个
-   prototype：每次从容器中获取的bean，都会创建一个新的
-   request：在Http请求中使用的同一个bean
-   session：在http session中使用的是同一个bean

## 2. 为什么有prototype

- 单例模式修改属性会有线程安全问题
比如
```java
@Autowired
HttpServletRequest request;
```
这里注入的HttpServletRequest不会有线程安全问题就是他是prototype的


### 2.1. 怎么使用prototype
- MainController

```java
@RestController
public class MainController
{
	@Autowired
	MainServices services;
}
```

- MainServices
```java
@Service
@Scope(value="prototype", proxyMode=ScopedProxyMode.TARGET_CLASS)//这里必须有ScopedProxyMode.TARGET_CLASS
public class MainServices
{
//...
}
```

## 3. 参考
- [spring的scope为prototype的bean的正确使用方法 \- 知乎](https://zhuanlan.zhihu.com/p/27971569)
