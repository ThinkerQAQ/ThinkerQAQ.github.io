---
title: "1.2 STW"
description: "1. 什么是STW 由于GC导致应用程序无法对外响应 2. 为什么会发生STW 有GC的语言中最起码的有两个线程，用户线程和GC线程 用户线程创建对象，GC回收对象，如果两个线程并发执行那可能把不是垃圾的对象给回收掉，需要GC期间会把用户线程暂停 3. 如何解决STW"
sourcePath: "Virtual_Machine/STW.md"
category: "garbage-collection"
categoryLabel: "Garbage Collection / Runtime"
topic: "fundamentals"
topicLabel: "1.Fundamentals"
order: 2
tags: ["Virtual_Machine"]
updatedAt: "2026-09-08T13:53:06Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 0. 版本说明（2026）

> STW 不等于“整个 GC 期间都暂停用户线程”。现代垃圾回收器通常会并发执行部分阶段，只在特定安全点、阶段切换或根扫描等环节暂停 mutator，具体取决于实现。

## 1. 什么是STW

由于GC导致应用程序无法对外响应
## 2. 为什么会发生STW
有GC的语言中最起码的有两个线程，用户线程和GC线程
用户线程创建对象，GC回收对象，如果两个线程并发执行那可能把不是垃圾的对象给回收掉，需要GC期间会把用户线程暂停
## 3. 如何解决STW
