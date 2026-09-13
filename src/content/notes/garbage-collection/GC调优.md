---
title: "2.1 GC调优"
description: "1. GC调优步骤 1.1. 确定GC调优目的 - CPU 利用率：回收算法会在多大程度上拖慢程序？有时候，这个是通过回收占用的 CPU 时间与其它 CPU 时间的百分比来描述的。 - GC 停顿时间：回收器会造成多长时间的停顿？目前的 GC 中需要考虑 STW 和 Mark Assist 两个部分"
sourcePath: "Virtual_Machine/GC调优.md"
category: "garbage-collection"
categoryLabel: "Garbage Collection / Runtime"
topic: "tuning"
topicLabel: "2.Tuning"
order: 4
tags: ["Virtual_Machine"]
updatedAt: "2026-09-08T13:53:06Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 0. 版本说明（2026）

> 这里记录的是通用的 GC 调优目标，但 `Mark Assist` 是 Go runtime 中的具体术语；实际可观测指标、参数和调优手段应以对应语言、运行时与版本为准。

## 1. GC调优步骤
### 1.1. 确定GC调优目的
- CPU 利用率：回收算法会在多大程度上拖慢程序？有时候，这个是通过回收占用的 CPU 时间与其它 CPU 时间的百分比来描述的。
- GC 停顿时间：回收器会造成多长时间的停顿？目前的 GC 中需要考虑 STW 和 Mark Assist 两个部分可能造成的停顿。
- GC 停顿频率：回收器造成的停顿频率是怎样的？目前的 GC 中需要考虑 STW 和 Mark Assist 两个部分可能造成的停顿。
- GC 可扩展性：当堆内存变大时，垃圾回收器的性能如何？但大部分的程序可能并不一定关心这个问题。

### 1.2. 观察GC

### 1.3. 调优
#### 1.3.1. 调参数

#### 1.3.2. 调代码
