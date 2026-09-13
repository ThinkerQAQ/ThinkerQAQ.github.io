---
title: "2.32 Autowired原理"
description: "1. 类继承图 2. 原理分析 1. spring容器refresh的时候有两个关键步骤，registerBeanPostProcessors和finishBeanFactoryInitialization 2. registerBeanPostProcessors会向spring容器注入Autow"
sourcePath: "Java/Framework/Spring/Spring常用注解/Autowired原理.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 34
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-18T13:19:10Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. 类继承图

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230104443.png)

## 2. 原理分析

1. spring容器refresh的时候有两个关键步骤，registerBeanPostProcessors和finishBeanFactoryInitialization
2. registerBeanPostProcessors会向spring容器注入AutowiredAnnotationBeanPostProcessor这个BeanPostProcessor，他有2个关键方法
- postProcessMergedBeanDefinition（来自MergedBeanDefinitionPostProcessor）
这个方法的作用是：将需要依赖注入的属性信息封装到InjectionMetadata类中，InjectionMetadata类中包含了哪些需要注入的元素及元素要注入到哪个目标类中
- postProcessPropertyValues（来自InstantiationAwareBeanPostProcessor）
这个方法的作用是：完成依赖属性的注入
3. finishBeanFactoryInitialization 在创建完bean实例后会调用AutowiredAnnotationBeanPostProcessor的postProcessMergedBeanDefinition方法，然后为属性赋值的时候会调用AutowiredAnnotationBeanPostProcessor的postProcessPropertyValues方法，最后通过BeanFactory的getBean(beanName,beanClass)获取注入的bean实例并通过反射完成属性的注入


![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230202452.png)

## 3. 参考
- [深入理解Spring系列之十四：@Autowired是如何工作的 \- 后端 \- 掘金](https://juejin.im/entry/5ad3fda5f265da238d512a98)
- [1.创建spring容器.md](/notes/java/Framework/Spring/Spring_IOC/%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90/1.%E5%88%9B%E5%BB%BAspring%E5%AE%B9%E5%99%A8/)
