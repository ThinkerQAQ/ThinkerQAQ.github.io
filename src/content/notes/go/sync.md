---
title: "2.3 sync"
description: "1. 是什么 提供了基本的 synchronization primitives 除了 Once 和 WaitGroup 外，大部分都是给 low-level 的库使用的 high-level 一般使用 channels 2. 有什么 2.1. Locker - 是个接口 - 有Lock和Unloc"
sourcePath: "Golang/sync.md"
category: "go"
categoryLabel: "Go"
topic: "concurrency"
topicLabel: "2.Concurrency"
order: 16
tags: ["Golang"]
createdAt: "2020-05-24T07:34:53Z"
updatedAt: "2020-09-06T09:44:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 是什么
提供了基本的`synchronization primitives`
除了`Once`和`WaitGroup`外，大部分都是给`low-level`的库使用的
`high-level`一般使用`channels`


## 2. 有什么

### 2.1. Locker
- 是个接口
- 有Lock和Unlock方法
### 2.2. Mutex
[sync.Mutex.md](/notes/go/sync.Mutex/)
### 2.3. RWMutex
[sync.RWMutex.md](/notes/go/sync.RWMutex/)

### 2.4. Cond
[sync.Cond.md](/notes/go/sync.Cond/)


### 2.5. Once
[sync.Once.md](/notes/go/sync.Once/)

### 2.6. Map
[sync.map.md](/notes/go/sync.map/)

### 2.7. Pool
[sync.pool.md](/notes/go/sync.pool/)
### 2.8. WaitGroup
[sync.WaitGroup.md](/notes/go/sync.WaitGroup/)


### 2.9. atomic包


[atomic.md](/notes/go/atomic/)
## 3. 参考
- [sync \- The Go Programming Language](https://golang.org/pkg/sync/#Locker)
- [atomic \- The Go Programming Language](https://golang.org/pkg/sync/atomic/)