---
title: "4.4 Golang内存泄露"
description: "Go 内存泄漏排查：长期引用、goroutine leak、cgo/native memory，以及 RSS、runtime/metrics、heap/allocs/goroutine pprof 的正确组合。"
sourcePath: "Golang/Golang内存泄露.md"
category: "go"
categoryLabel: "Go"
topic: "performance"
topicLabel: "4.Performance"
order: 41
tags: ["Golang"]
createdAt: "2022-07-11T12:21:21Z"
updatedAt: "2022-07-11T12:21:21Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 什么叫“内存泄漏”

Go 有 GC，但有 GC 不代表程序不会长期占用不再需要的内存。

常见情况可以分成三类：

1. **Go heap 中的对象仍然可达**：程序逻辑已经不需要它，但还有 root / cache / global / container 等引用，GC 不能回收；
2. **goroutine leak**：goroutine 永远无法退出，同时保留自己的 stack、引用对象、timer、channel、socket 等资源；
3. **Go runtime 之外的内存**：例如 cgo/C library、`mmap` 或其他 native allocation，Go heap profile 不一定看得到。

因此排查“内存越来越大”时，要先区分：

```text
Go live heap 在涨？
Go runtime memory 在涨？
还是进程 RSS 在涨，但 Go runtime 指标没有同步增长？
```

## 2. Go heap 对象长期被引用

最简单的例子：

```go
var cache = map[int][]byte{}

func keepAlloc() {
    for i := 0; i < 10000; i++ {
        cache[i] = make([]byte, 1<<10)
    }
}
```

只要 `cache` 还引用这些 `[]byte`，GC 就必须认为它们是 live objects。

这种问题不是 GC “没工作”，而是程序仍然告诉 GC：

> 这些对象还可达。

常见来源：

- 没有上限的 cache / map；
- slice 持有大 backing array；
- subscriber / callback 没注销；
- timer / resource 生命周期没有结束；
- 长生命周期对象引用短生命周期对象。

排查时优先看 heap profile 的 `inuse_space` / `inuse_objects`。

## 3. goroutine leak

如果启动的 goroutine 永远无法走到退出路径，它就会一直存在。

```go
func leak() {
    for i := 0; i < 100000; i++ {
        go func() {
            select {}
        }()
    }
}
```

goroutine 本身会占用 stack 和 runtime 元数据，更重要的是它可能继续引用其他 heap object，使这些对象也无法被 GC。

所以 goroutine leak 经常最终表现为 memory growth。

### 3.1. 一个典型的超时泄漏

旧代码：

```go
func rebuild() {
    var wg sync.WaitGroup
    wg.Add(3)

    for i := 0; i < 3; i++ {
        go func() {
            defer wg.Done()
            // work
        }()
    }

    ch := make(chan struct{})

    go func() {
        wg.Wait()
        ch <- struct{}{}
    }()

    select {
    case <-ch:
        return
    case <-time.After(10 * time.Second):
        return
    }
}
```

如果外层先 timeout 返回，之后 `wg.Wait()` 才完成，那么：

```go
ch <- struct{}{}
```

再也没有 receiver，这个 goroutine 会永久阻塞。

对于这种只需要通知“完成”的场景，可以使用 `close`，因为 `close(ch)` 不需要等待 receiver：

```go
ch := make(chan struct{})

go func() {
    wg.Wait()
    close(ch)
}()

select {
case <-ch:
case <-time.After(10 * time.Second):
}
```

更完整的生产代码还应该让真正的 worker 支持 `context.Context` / cancellation，否则外层超时了，worker 自己仍可能继续运行。

### 3.2. HTTP timeout

只设置 `DialContext.Timeout` 只约束建连阶段，不等于整个 HTTP request 有 deadline。

简单场景可以给 client 设置整体 timeout：

```go
client := &http.Client{
    Timeout: 10 * time.Second,
}
```

更常见的服务端代码会让 request 携带 context deadline，再把 context 继续传给下游调用。

## 4. cgo / native memory

Go heap profile 主要描述 Go runtime 管理的 allocation。

如果 C library 自己使用 `malloc`、native image library 分配大块内存，或者程序直接 `mmap`，这些内存不一定能从 Go heap pprof 中看到。

这里要修正旧笔记里的一个说法：

> **不能根据“用了 cgo + OS thread 多”直接推出 cgo 内存泄漏，也不能认为每次 cgo call 都会简单地创建一条独立 OS thread。**

正确方式仍然是证据链：

```text
RSS 明显增长
    ↓
Go runtime memory / Go heap 没有同等增长
    ↓
确认程序是否有 cgo / mmap / native allocator
    ↓
再使用 native profiler / allocator stats / perf / eBPF 等工具
```

## 5. 先区分 RSS 和 Go runtime memory

### 5.1. RSS

Linux `top` / `ps` / cgroup memory 看到的是 OS 视角的进程物理内存。

### 5.2. Go runtime memory

可以看：

```go
runtime.ReadMemStats(&m)
```

更适合持续监控的是：

```go
runtime/metrics
```

例如 Go runtime memory limit 使用的口径就是：

```text
/memory/classes/total:bytes
-
/memory/classes/heap/released:bytes
```

对应 `MemStats` 的近似表达：

```text
Sys - HeapReleased
```

但它**不是 RSS**。

因此不要再使用旧笔记里的：

```text
Sys ≈ RSS
Sys = HeapSys + StackSys
```

这种等式来判断内存泄漏。相关指标解释见：[内存管理.md](/notes/go/%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/)

## 6. 用 pprof 排查

### 6.1. heap

```bash
go tool pprof http://127.0.0.1:6060/debug/pprof/heap
```

进入以后优先看：

```text
top
 top -cum
```

也可以启动 UI：

```bash
go tool pprof -http=:9090 \
  http://127.0.0.1:6060/debug/pprof/heap
```

注意不要写成：

```text
.../heap?debug=1
```

再交给 `go tool pprof`。`debug=1` 是文本输出，更适合直接浏览 / curl；pprof 分析使用正常 profile endpoint。

### 6.2. inuse 与 alloc

排查当前内存长期增长：

```text
-inuse_space
-inuse_objects
```

排查 allocation churn / GC 压力：

```text
-alloc_space
-alloc_objects
```

一个函数累计分配很多内存，不代表这些对象现在还活着；所以 `alloc_space` 大和“内存泄漏”不是同一个结论。

### 6.3. goroutine

```bash
go tool pprof http://127.0.0.1:6060/debug/pprof/goroutine
```

或者直接看 stack：

```bash
curl 'http://127.0.0.1:6060/debug/pprof/goroutine?debug=2'
```

如果同一种 stack 的 goroutine 数持续增长，很可能存在 lifecycle / cancellation 问题。

也可以持续观测：

```go
runtime.NumGoroutine()
```

## 7. 对比 profile 比只看一张更有价值

内存泄漏本质上是**趋势**，因此单张 heap profile 往往信息不足。

更实用的方式：

```text
T0 正常状态 profile
        ↓
等待一段时间 / 跑一轮压测
        ↓
T1 异常状态 profile
        ↓
比较哪些 stack 的 inuse 持续增长
```

例如分别保存：

```bash
curl -o heap-0.pb.gz http://127.0.0.1:6060/debug/pprof/heap
# wait / load
curl -o heap-1.pb.gz http://127.0.0.1:6060/debug/pprof/heap
```

然后再配合 pprof 比较。

## 8. RSS 不下降不等于泄漏

即使 Go object 已经被 GC 回收，runtime 是否立刻把对应 physical pages 归还给 OS 是另一个问题。

Go runtime 还有 scavenger，Linux 下也存在 `MADV_DONTNEED` / `MADV_FREE` 等不同 page reclaim 行为，它们会影响 RSS 下降的时机。

因此：

> **“压测结束后 RSS 没马上回到原值”本身不能证明 Go heap 泄漏。**

需要同时看：

- live heap；
- `HeapIdle` / `HeapReleased`；
- runtime memory；
- RSS；
- 一段时间内的趋势。

## 9. 一个最小排查流程

```text
1. 确认是持续增长，不是一次性的 high-water mark
        ↓
2. 看 RSS + runtime/metrics
        ↓
3. heap pprof 看 live heap
        ↓
4. allocs 看 allocation churn
        ↓
5. goroutine profile 看 goroutine leak
        ↓
6. Go runtime 对不上 RSS 时，再查 cgo / mmap / native memory
        ↓
7. 用前后两份 profile 验证修复效果
```

详细的 pprof 使用见：[pprof.md](/notes/go/pprof/)

## 10. 参考

- [Go Diagnostics](https://go.dev/doc/diagnostics)
- [runtime package](https://pkg.go.dev/runtime)
- [runtime/metrics](https://pkg.go.dev/runtime/metrics)
- [net/http/pprof](https://pkg.go.dev/net/http/pprof)
- [A Guide to the Go Garbage Collector](https://go.dev/doc/gc-guide)
