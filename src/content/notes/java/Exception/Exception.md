---
title: "1.Exception"
description: "1. 异常体系 - Error：表示系统级的错误，程序处理不了也无法处理 - Exception：表示需要由程序处理的异常 - UnCheckedException：由名字可以看出不需要我们处理。是一种常见运行错误，只要程序设计得没有问题通常就不会发生 - CheckedException：由名字可"
sourcePath: "Java/Exception/Exception.md"
category: "java"
categoryLabel: "Java"
topic: "Exception"
topicLabel: "1.Exception"
order: 1
tags: ["Java"]
createdAt: "2020-02-12T13:52:57Z"
updatedAt: "2020-03-03T02:26:12Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 异常体系

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200212215716.png)

- Error：表示系统级的错误，程序处理不了也无法处理
- Exception：表示需要由程序处理的异常
    - UnCheckedException：由名字可以看出不需要我们处理。是一种常见运行错误，只要程序设计得没有问题通常就不会发生
    - CheckedException：由名字可以看出需要我们checked（捕获处理）。跟程序运行的上下文环境有关，即使程序设计无误，仍然可能因使用的问题而引发

## 2. Java异常处理
- try：用来指定一块预防所有异常的程序
- catch：紧跟在try后面，用来捕获异常
- throw：用来明确的抛出一个异常
- throws：用来标明一个成员函数可能抛出的各种异常
- finally：确保一段代码无论发生什么异常都会被执行的一段代码。

### 2.1. try-return-finally执行顺序

先执行finally块，执行完再return

## 3. 参考
- [Java异常处理面试题归纳\_曹海成的专栏\-CSDN博客](https://blog.csdn.net/caohaicheng/article/details/38025329)
