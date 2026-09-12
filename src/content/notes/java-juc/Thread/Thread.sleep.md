---
title: "18.2 Thread.sleep"
description: "1. sleep结束后什么时候唤醒 假设某个线程在 2020-01-09 22:47:54 运行上面这段代码，那么他会在 2020-01-09 22:47:55 立马往下执行么？ - 答案 不一定，这段代码的意思只是在 2020-01-09 22:47:55 有机会去抢占CPU，而不是获得了CPU并"
sourcePath: "Java/JUC/Thread/Thread.sleep.md"
category: "java-juc"
categoryLabel: "Java / JUC"
topic: "Thread"
topicLabel: "18.Thread"
order: 32
tags: ["Java","JUC"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-02-11T11:55:26Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---





## 1. sleep结束后什么时候唤醒
```java
Thread.Sleep(1000);
```
假设某个线程在`2020-01-09 22:47:54`运行上面这段代码，那么他会在`2020-01-09 22:47:55`立马往下执行么？

- 答案
不一定，这段代码的意思只是在`2020-01-09 22:47:55`有机会去抢占CPU，而不是获得了CPU并执行


## 2. Thread.sleep vs Object.wait
|            |           sleep            |                wait                |
| ---------- | -------------------------- | ---------------------------------- |
| 使用        | Thread的静态方法。直接调用  | Object类的实例方法。配合sychronized |
| 作用       | 让当前线程暂停执行指定的时间 | 让当前线程等待                      |
| 是否释放锁  | 不释放锁                   | 释放锁                             |
| 是否让出CPU | 是                         | 是                                 |
| 如何唤醒    | 时间到了自动唤醒            | 由notify唤醒                       |

## 3. 参考
- [理解 Thread\.Sleep 函数 \- \[虫子\] \- 博客园](https://www.cnblogs.com/ILove/archive/2008/04/07/1140419.html)




