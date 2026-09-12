---
title: "3.7 GC"
description: "Go GC 的基本模型、三色标记与写屏障、当前 Green Tea GC、GOGC/GOMEMLIMIT、观测和调优。保留历史学习脉络，同时标注已经过时的 memory ballast 等做法。"
sourcePath: "Golang/GC.md"
category: "go"
categoryLabel: "Go"
topic: "runtime"
topicLabel: "3.Runtime"
order: 35
tags: ["Golang"]
createdAt: "2020-08-16T12:37:23Z"
updatedAt: "2022-06-30T15:00:08Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 什么是 GC

GC（Garbage Collection）负责回收程序已经不可达的堆对象，使 Go 程序不需要手工 `free` 每一个对象。

Go GC 的核心目标是在 **吞吐量、暂停时间和内存占用** 之间做平衡。

## 2. 为什么需要 GC

如果对象分配到堆上，它的生命周期不再和某一个函数栈帧完全一致，就需要 runtime 判断对象什么时候已经不可达，再回收对应内存。

GC 本身也会带来成本：

- 扫描对象需要 CPU；
- 某些阶段需要短暂 STW；
- 堆越大、指针越多，扫描成本通常越高；
- GC 频率太高会增加 CPU 开销，太低又会增加内存占用。

内存泄漏相关问题见：[Golang内存泄露.md](/notes/go/Golang%E5%86%85%E5%AD%98%E6%B3%84%E9%9C%B2/)

## 3. Go GC 的基本过程

从概念上看，一个 GC cycle 可以理解成：

1. 标记准备（短暂 STW）；
2. 并发标记；
3. 标记终止（短暂 STW）；
4. 并发清扫 / 后续回收工作。

Go runtime 的实现一直在演进，所以这里适合记住的是 **并发 tracing GC + 很短的 STW 边界**，不要把某个版本的 runtime 源码流程当成语言规范。

## 4. 三色标记模型

三色标记是理解 tracing GC 很常见的教学模型：

- **白色**：还没有被 GC 证明存活；
- **灰色**：对象本身已确认存活，但它引用的对象还需要继续扫描；
- **黑色**：对象和它引用的对象都已经扫描完成。

GC 最终要找出从 roots 可达的对象，剩下不可达对象才可以回收。

### 4.1. 为什么需要写屏障

如果 GC 和用户 goroutine 并发执行，对象引用关系会在标记过程中变化。

典型问题是：

1. GC 已经扫描完一个黑色对象；
2. 用户代码把某个白色对象挂到这个黑色对象下面；
3. 原来能发现白色对象的灰色引用又被删除；
4. 如果没有额外机制，这个实际上仍然存活的对象可能被漏标。

因此并发 GC 需要写屏障，在指针写入时维持 GC 所需的不变式。

历史上常用两个概念解释：

- 强三色不变式；
- 弱三色不变式。

Go 的具体 barrier 设计和实现会随版本变化，理解“不允许并发修改让存活对象从 tracing graph 中消失”比背某段旧 runtime 源码更重要。

## 5. 当前 GC：Green Tea

Go 1.25 引入了实验性的 Green Tea GC，Go 1.26 起默认启用，Go 1.27 继续沿用这一代 GC 实现。

Green Tea 的重点不是改变 Go 的 GC 语义，而是优化标记和扫描阶段的执行方式，尤其改善：

- 小对象扫描的局部性；
- 多核扩展能力；
- 新一些 amd64 CPU 上的扫描效率。

Go 官方给出的预期是：在 GC 压力较重的真实 workload 中，GC overhead 可能下降约 10%～40%，但具体收益依赖 workload。

因此这篇旧笔记里的三色标记、写屏障仍适合做概念理解，但不能直接等同于当前 Green Tea 的具体实现细节。

## 6. GC 如何触发

### 6.1. 主动触发

```go
runtime.GC()
```

`runtime.GC` 会强制执行一次 GC，并等待本次 GC 完成。正常业务代码很少需要主动调用。

### 6.2. `GOGC`

`GOGC` 控制 GC 的内存增长目标。

默认：

```text
GOGC=100
```

也可以运行时调整：

```go
debug.SetGCPercent(100)
```

大体规律：

- 更大的 `GOGC`：GC 更少，CPU 开销通常更低，但使用更多内存；
- 更小的 `GOGC`：GC 更频繁，内存更紧，但消耗更多 CPU。

### 6.3. `GOMEMLIMIT`

Go 1.19 起增加了 soft memory limit：

```text
GOMEMLIMIT=2GiB
```

或者：

```go
debug.SetMemoryLimit(2 << 30)
```

这个限制针对 Go runtime 管理的内存，不等于操作系统看到的进程 RSS，也不包含所有 cgo / mmap 等外部内存。

runtime 会通过更积极的 GC 和内存归还来尽量遵守这个限制。

需要注意：**不要把 GOMEMLIMIT 设得比程序稳定运行所需内存还低**，否则可能造成 GC 几乎持续运行。

## 7. 如何观察 GC

### 7.1. `GODEBUG=gctrace=1`

```bash
GODEBUG=gctrace=1 ./app
```

可以快速观察：

- GC 次数；
- STW / concurrent mark 时间；
- GC 前后 heap 大小；
- heap goal；
- CPU 消耗。

具体日志格式属于 runtime 诊断输出，会随 Go 版本变化，不应该依赖固定列位置做长期监控协议。

### 7.2. `go tool trace`

程序中记录 trace：

```go
f, _ := os.Create("trace.out")
defer f.Close()

trace.Start(f)
defer trace.Stop()
```

查看：

```bash
go tool trace trace.out
```

适合分析 GC、调度、goroutine、网络阻塞等事件之间的时间关系。

### 7.3. `runtime.MemStats`

```go
var m runtime.MemStats
runtime.ReadMemStats(&m)
```

可以查看：

```text
HeapAlloc
HeapSys
HeapObjects
NumGC
PauseTotalNs
GCCPUFraction
...
```

### 7.4. `runtime/metrics`

现在做长期监控时，也应该了解 `runtime/metrics`。它提供更通用的 runtime metric API，例如：

```text
/gc/heap/live:bytes
/gc/heap/goal:bytes
/gc/gogc:percent
/gc/gomemlimit:bytes
/memory/classes/total:bytes
```

## 8. GC 调优

### 8.1. 先确认问题是不是 GC

不要看到 CPU 高就直接调 `GOGC`。

先结合：

- CPU profile；
- heap / alloc profile；
- `gctrace`；
- `runtime/metrics`；
- trace；
- 实际延迟和吞吐指标。

确认 GC 真的是瓶颈再调整。

### 8.2. 第一优先级：减少 live heap 和 allocation rate

常见手段：

- 减少不必要的临时对象；
- 预分配确定容量的 slice / map；
- 避免无意义的 string / `[]byte` 来回转换；
- 减少对象生命周期；
- benchmark + pprof 验证热点分配。

这通常比直接调 GC 参数更稳定。

### 8.3. 调整 `GOGC`

如果机器内存充足而 CPU 更紧，可以适当提高 `GOGC`，用更多内存换更少 GC。

如果内存非常紧，降低 `GOGC` 可以缩小 heap，但会增加 GC CPU。

### 8.4. 配合 `GOMEMLIMIT`

对容器、Kubernetes 或有明确 memory budget 的进程，`GOMEMLIMIT` 比单独依赖 `GOGC` 更直接。

通常应给 Go runtime 留出一定 headroom，因为进程总内存还可能包括：

- 可执行文件；
- cgo/C 内存；
- mmap；
- kernel / OS 侧记账；
- 其他 runtime 之外的内存。

### 8.5. memory ballast 已经过时

早期常见做法是分配一块很大的 ballast，让 GC 根据更大的 heap target 降低频率。

在没有 `GOMEMLIMIT` 的时代，这是一种工程 workaround。

现在已有官方 soft memory limit，**不应该再把 memory ballast 当成默认调优方案**。

### 8.6. `sync.Pool`

`sync.Pool` 可以复用临时对象，减少 allocation rate，但它不是通用缓存：Pool 中对象可以在任意 GC 周期被 runtime 清理。

因此适合：

- 生命周期短；
- 创建成本较高；
- 可以被安全复用的临时对象。

是否有效仍然需要 benchmark / profile 验证。

## 9. 一个更实用的调优顺序

```text
先测量
  ↓
确认 GC / allocation 是否真是瓶颈
  ↓
减少 live heap / allocation rate
  ↓
再考虑 GOGC
  ↓
有明确 memory budget 时配置 GOMEMLIMIT
  ↓
重新 benchmark + profile
```

## 10. 参考
- [A Guide to the Go Garbage Collector](https://go.dev/doc/gc-guide)
- [Go 1.26 Release Notes - Green Tea GC](https://go.dev/doc/go1.26)
- [The Green Tea Garbage Collector](https://go.dev/blog/greenteagc)
- [runtime/debug.SetGCPercent](https://pkg.go.dev/runtime/debug#SetGCPercent)
- [runtime/debug.SetMemoryLimit](https://pkg.go.dev/runtime/debug#SetMemoryLimit)
- [runtime/metrics](https://pkg.go.dev/runtime/metrics)
- [Golang内存泄露.md](/notes/go/Golang%E5%86%85%E5%AD%98%E6%B3%84%E9%9C%B2/)
