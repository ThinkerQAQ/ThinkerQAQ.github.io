---
title: "7.2 Java线上问题排查"
description: "1. 内存占用100% / 内存问题 1.1. 查找Java进程ID top 命令，按下 M 查看哪个java进程占用内存最高 1.2. 分析是否发生OOM OOM问题举例.md 2. CPU占用100% / 线程问题 2.1. 查找Java进程ID和线程ID 1. top 命令，按下 P 查看哪个"
sourcePath: "Java/JVM/调优/Java线上问题排查.md"
category: "java"
categoryLabel: "Java"
topic: "JVM"
topicLabel: "7.JVM"
order: 195
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-03-17T13:32:35Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. 内存占用100% / 内存问题

### 1.1. 查找Java进程ID
`top`命令，按下`M`查看哪个java进程占用内存最高

### 1.2. 分析是否发生OOM
[OOM问题举例.md](/notes/java/JVM/%E8%B0%83%E4%BC%98/%E5%86%85%E5%AD%98%E6%B3%84%E6%BC%8F/OOM%E9%97%AE%E9%A2%98%E4%B8%BE%E4%BE%8B/)

## 2. CPU占用100% / 线程问题

### 2.1. 查找Java进程ID和线程ID


1. `top`命令，按下`P`查看哪个java进程负载高，记录其PID
2. `top -Hp 第1步的PID`查看该进程所有线程的运行状态
3. 记录下高负载的线程ID，`printf "%x\n" 第1步的PID`转换成16进制
### 2.2. 分析线程Dump文件
4. `jstack 第1步的PID > 文件`，生成堆栈状态的jstack文件
5. 在第4步的jstack文件中找到`nid为第3步的16进制的线程ID`
6. 从堆栈中了解到线程在执行什么任务，并结合业务与代码判断问题所在


## 3. 线程死锁
### 3.1. 查找Java进程ID
有两种方法：

- 使用`top`找出STATE为`sleeping`，COMMAND为`java`的PID
- 使用jps

### 3.2. 分析线程Dump文件

```java
jstack -l PID
```

分析是否由循环加锁的现象



## 4. JVM调优
[调优思路.md](/notes/java/JVM/%E8%B0%83%E4%BC%98/%E8%B0%83%E4%BC%98%E6%80%9D%E8%B7%AF/)

## 5. 参考
- [jstack线程分析 \- 简书](https://www.jianshu.com/p/7f006b743d3a)
- [Java内存泄漏的排查总结\_fishinhouse的专栏\-CSDN博客](https://blog.csdn.net/fishinhouse/article/details/80781673)
- [利用内存分析工具（Memory Analyzer Tool，MAT）分析java项目内存泄露\_Memory Analyzer Tool,mat,内存泄露\_雪水\-CSDN博客](https://blog.csdn.net/wanghuiqi2008/article/details/50724676)
- [jvm优化必知系列——监控工具 \- 掘金](https://juejin.im/post/59e6c1f26fb9a0451c397a8c#heading-9)
