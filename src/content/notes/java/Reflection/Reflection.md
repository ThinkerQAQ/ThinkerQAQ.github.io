---
title: "9.Reflection"
description: "1. 什么是反射 运行时 - 动态的获取类的信息：如属性、方法等 - 动态的创建对象、对属性赋值、调用对象的方法 2. 使用 - Java 反射由浅入深 \\ 进阶必备 \\- 掘金 3. 原理 - javac编译.java文件为.class文件 - 类加载器加载.class文件到方法区中 - 创建该类"
sourcePath: "Java/Reflection/Reflection.md"
category: "java"
categoryLabel: "Java"
topic: "Reflection"
topicLabel: "9.Reflection"
order: 217
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-02-11T14:14:15Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 1. 什么是反射

运行时

- 动态的获取类的信息：如属性、方法等
- 动态的创建对象、对属性赋值、调用对象的方法


## 2. 使用

- [Java 反射由浅入深 \| 进阶必备 \- 掘金](https://juejin.im/post/598ea9116fb9a03c335a99a4)

## 3. 原理

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229203011.png)

- javac编译.java文件为.class文件
- 类加载器加载.class文件到方法区中
- 创建该类的Class对象保存在堆中
- 调用new创建实例对象保存在堆中
- 栈中变量的引用指向这个堆中的内存



## 4. 参考链接

- [学习java应该如何理解反射？ \- 知乎](https://www.zhihu.com/question/24304289)
- [java反射怎么实现的？ \- 知乎](https://www.zhihu.com/question/46883050)
