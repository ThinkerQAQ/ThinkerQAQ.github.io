---
title: "5.5 Object"
description: "1. 方法 1.1. getClass 返回对象实例的class对象 1.2. hashCode 当需要使用hash table之类的数据结构时才会使用到这个方法，用来计算在数组中的位置。 当重写了equals方法的时候需要重写hashCode方法，必须保证 a.equals(b) 为true时， "
sourcePath: "Java/JDK/Object/Object.md"
category: "java"
categoryLabel: "Java"
topic: "JDK"
topicLabel: "5.JDK"
order: 127
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-03-03T02:30:45Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. 方法


### 1.1. getClass

返回对象实例的class对象

### 1.2. hashCode

当需要使用hash table之类的数据结构时才会使用到这个方法，用来计算在数组中的位置。
当重写了equals方法的时候需要重写hashCode方法，必须保证`a.equals(b)`为true时，`a.hashCode()==b.hashCode()`

### 1.3. equals

判断两个对象是否相等，默认比较他们的地址

### 1.4. toString

返回对象的字符串表示

### 1.5. notify

获取了monitor锁之后使用。用来唤醒等待object monitor的任意一个线程

### 1.6. notifyAll

获取了monitor锁之后使用。用来唤醒等待object monitor的任意所有线程

### 1.7. wait

获取了monitor锁之后使用。让当前线程释放monitor，等待其他线程调用notify唤醒继续抢占monitor


### 1.8. clone

clone方法不是Cloneable接口的

## 2. 如果equals相同但是hashCode不同会发生什么

HashMap、HashSe这种不允许重复的集合中会出现重复的元素。需要使用hashCode和equals判断是否相同


## 3. wait sleep区别
[Java 并发编程：线程间的协作\(wait/notify/sleep/yield/join\) \- liuxiaopeng \- 博客园](https://www.cnblogs.com/paddix/p/5381958.html)
