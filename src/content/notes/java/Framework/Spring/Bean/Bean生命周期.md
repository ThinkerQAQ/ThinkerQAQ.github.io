---
title: "2.44 Bean生命周期"
description: "1. 流程 - 对Bean进行实例化 - 将值和引用注入到Bean对应的属性中 - 通过Aware接口把Spring底层组件注入Bean - BeanPostProcessor。执行额外的逻辑。在InitializingBean的前后执行，会把当前正在创建的Bean传入 - Initializing"
sourcePath: "Java/Framework/Spring/Bean/Bean生命周期.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 46
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-28T03:22:37Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 1. 流程
- 对Bean进行实例化
- 将值和引用注入到Bean对应的属性中
- 通过Aware接口把Spring底层组件注入Bean
- BeanPostProcessor。执行额外的逻辑。在InitializingBean的前后执行，会把当前正在创建的Bean传入
- InitializingBean。执行额外的逻辑。但不会把正在创建的Bean传入
- DisposableBean。销毁bean的时候调用destroy方法

## 2. 使用
总共有四种方式
### 2.1. @Bean注解指定init和destroy方法
```java
public class BeanCycle
{
    public BeanCycle()
    {
        System.out.println("1.bean创建");
    }

    public void init()
    {
        System.out.println("2.bean初始化");
    }

    public void destroy()
    {
        System.out.println("3.bean销毁");
    }
}


@Bean(initMethod = "init", destroyMethod = "destroy")
public BeanCycle beanCycle()
{
    return new BeanCycle();
}
```

### 2.2. 实现InitializingBean, DisposableBean
```java
@Component
@ComponentScan("com.zsk.context.bean")
public class BeanCycle2 implements InitializingBean, DisposableBean
{
    public BeanCycle2()
    {
        System.out.println("bean2创建");
    }


    @Override
    public void afterPropertiesSet() throws Exception
    {
        System.out.println("bean2属性设置完");

    }

    @Override
    public void destroy() throws Exception
    {
        System.out.println("bean2销毁");

    }
}
```

### 2.3. 在方法上修饰@PostConstruct, @PreDestroy


### 2.4. 实现BeanPostProcessor
```java
@Component
public class MyBeanPostProcessor implements BeanPostProcessor
{
    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException
    {
        System.out.println("初始化之前做一些工作");
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException
    {
        System.out.println("初始化之后做一些工作");
        return bean;
    }
}

```

## 3. 参考

- [Spring Bean的生命周期（非常详细） \- Chandler Qian \- 博客园](https://www.cnblogs.com/zrtqsk/p/3735273.html)
- [1.创建spring容器.md](/notes/java/Framework/Spring/Spring_IOC/%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90/1.%E5%88%9B%E5%BB%BAspring%E5%AE%B9%E5%99%A8/)
