---
title: "8.OOP"
description: "1. 创建子类对象时，父类对象会也被一起创建么 不会。 super关键词只不过是调用父类构造方法来初始化属性 2. 子类有没有继承父类的私有变量？ 从继承的概念来说，private和final不被继承。Java官方文档上是这么说的。 从内存的角度来说，父类的一切都被继承(从父类构造方法被调用就知道了"
sourcePath: "Java/OOP/OOP.md"
category: "java"
categoryLabel: "Java"
topic: "OOP"
topicLabel: "8.OOP"
order: 216
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-02-11T14:13:26Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 1. 创建子类对象时，父类对象会也被一起创建么

不会。
super关键词只不过是调用父类构造方法来初始化属性

## 2. 子类有没有继承父类的私有变量？

从继承的概念来说，private和final不被继承。Java官方文档上是这么说的。
从内存的角度来说，父类的一切都被继承(从父类构造方法被调用就知道了，因为new一个对象，就会调用构造方法，子类被new的时候就会调用父类的构造方法，所以从内存的角度来说，子类拥有一个完整的父类)。



## 3. 参考链接

- <https://www.zhihu.com/question/51920553>
- <https://www.zhihu.com/question/51345942>
- <https://docs.oracle.com/javase/tutorial/java/IandI/subclasses.html>
