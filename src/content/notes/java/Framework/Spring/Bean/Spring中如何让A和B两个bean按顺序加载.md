---
title: "2.55 Spring中如何让A和B两个bean按顺序加载"
description: "1. 使用@DependsOn注解 - TestController - TestService - 启动的时候输出 2. 参考 - Spring 中如何控制2个bean中的初始化顺序？ \\- 知乎 - @DependsOn或depends\\-on配置的使用 \\- 掘金"
sourcePath: "Java/Framework/Spring/Bean/Spring中如何让A和B两个bean按顺序加载.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 57
tags: ["Java"]
createdAt: "2020-02-03T13:52:21Z"
updatedAt: "2020-02-21T08:30:33Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 使用@DependsOn注解

- TestController

```java
@DependsOn("testService")
@Service
public class TestController
{
    @Autowired
    private TestService testService;
    public TestController()
    {
        System.out.println(this.getClass().getSimpleName() + "初始化。。。");
    }

    public void test()
    {
        String byId = testService.getById(1);
        System.out.println(byId);
    }
}

```


- TestService

```java
@Service
public class TestService
{

    public TestService()
    {
        System.out.println(this.getClass().getSimpleName() + "初始化。。。");
    }

    public String getById(Integer id)
    {
        return "" + id;
    }
}
```

- 启动的时候输出

```
TestService初始化。。。
TestController初始化。。。
```

## 2. 参考
- [Spring 中如何控制2个bean中的初始化顺序？ \- 知乎](https://zhuanlan.zhihu.com/p/30112785)
- [@DependsOn或depends\-on配置的使用 \- 掘金](https://juejin.im/post/5cdcdaf7f265da038f7767d0)
