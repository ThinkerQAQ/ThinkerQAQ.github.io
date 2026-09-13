---
title: "4.2 pprof"
description: "Go pprof 性能分析：CPU、heap/allocs、goroutine、block、mutex profile，以及 runtime/pprof、net/http/pprof 和 go tool pprof 的当前使用方式。"
sourcePath: "Golang/pprof.md"
category: "go"
categoryLabel: "Go"
topic: "performance"
topicLabel: "4.Performance"
order: 39
tags: ["Golang"]
createdAt: "2020-08-26T15:01:04Z"
updatedAt: "2022-12-11T07:41:37Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. pprof 是什么

pprof 是 Go 常用的 **sampling profiler**：采样程序运行中的 CPU、内存分配、goroutine、阻塞和锁竞争等信息，再用 `go tool pprof` 分析。

它适合回答的问题包括：

- CPU 时间主要耗在哪里？
- 当前 live heap 主要被哪些调用路径占用？
- 程序运行以来哪些地方累计分配了最多内存？
- goroutine 是否持续增长或阻塞？
- 哪些同步点阻塞严重？
- 哪些 mutex 形成明显竞争？

如果问题是 **goroutine 调度时间线、syscall、GC、并行度和延迟**，通常应该看 [trace.md](/notes/go/trace/)，而不是只看 pprof。

## 2. profile 类型

当前最常用的 profile：

| profile | 主要看什么 |
| --- | --- |
| CPU | CPU active time 的热点 |
| heap | 当前仍存活对象的采样分配信息，默认关注 `inuse_space` |
| allocs | 程序启动以来累计分配，默认关注 `alloc_space` |
| goroutine | 当前 goroutine 的 stack trace |
| block | goroutine 在同步原语上阻塞的时间 |
| mutex | mutex contention |
| threadcreate | 导致 OS thread 创建的 stack trace |

注意：

- heap / allocs 是 **采样结果**，不是每一个 allocation 的完整日志；
- block profile 默认不开，需要配置 `runtime.SetBlockProfileRate`；
- mutex profile 默认也不开，需要配置 `runtime.SetMutexProfileFraction`；
- 不同 profiler 会给程序带来额外开销，生产环境要控制采样时长和频率。

## 3. runtime/pprof

`runtime/pprof` 适合 CLI、离线任务，或者你希望由程序自己决定 profile 文件写到哪里。

### 3.1. CPU profile

```go
package main

import (
    "os"
    "runtime/pprof"
    "time"
)

func work() {
    for i := 0; i < 100_000_000; i++ {
        _ = i * i
    }
}

func main() {
    f, err := os.Create("cpu.pprof")
    if err != nil {
        panic(err)
    }
    defer f.Close()

    if err := pprof.StartCPUProfile(f); err != nil {
        panic(err)
    }
    defer pprof.StopCPUProfile()

    work()
    time.Sleep(time.Second)
}
```

分析：

```bash
go tool pprof cpu.pprof
```

常用命令：

```text
top
 top -cum
list <func>
web
```

也可以直接启动浏览器 UI：

```bash
go tool pprof -http=:9090 cpu.pprof
```

`top` 中几个重要字段：

- `flat`：样本直接落在当前函数上的成本；
- `flat%`：当前函数自身成本占比；
- `cum`：当前函数连同其调用链向下累计的成本；
- `cum%`：累计成本占比。

因此排查热点时通常会同时看 `flat` 和 `cum`，而不是只按一个字段排序。

### 3.2. heap profile

程序内可以写 heap profile：

```go
f, err := os.Create("heap.pprof")
if err != nil {
    panic(err)
}
defer f.Close()

if err := pprof.WriteHeapProfile(f); err != nil {
    panic(err)
}
```

**要在你想观察的 workload 执行之后、问题已经出现的时候采集。**

分析：

```bash
go tool pprof heap.pprof
```

常见视角：

```text
-inuse_space    当前 live objects 占用的字节数
-inuse_objects  当前 live objects 数量
-alloc_space    累计分配字节数
-alloc_objects  累计分配对象数
```

排查“为什么当前内存高”通常先看 `inuse_space`；排查“为什么 GC 压力大、allocation rate 高”则常看 `alloc_space`。

内存问题见：[Golang内存泄露.md](/notes/go/Golang%E5%86%85%E5%AD%98%E6%B3%84%E9%9C%B2/)

## 4. net/http/pprof

对于长期运行的服务，更常用 `net/http/pprof` 暴露 profile endpoint。

如果使用 `http.DefaultServeMux`：

```go
package main

import (
    "log"
    "net/http"
    _ "net/http/pprof"
)

func main() {
    go func() {
        log.Println(http.ListenAndServe("127.0.0.1:6060", nil))
    }()

    // service logic...
    select {}
}
```

然后访问：

```text
http://127.0.0.1:6060/debug/pprof/
```

### 4.1. CPU

采集 30 秒 CPU profile：

```bash
go tool pprof 'http://127.0.0.1:6060/debug/pprof/profile?seconds=30'
```

### 4.2. heap / allocs

```bash
go tool pprof http://127.0.0.1:6060/debug/pprof/heap
go tool pprof http://127.0.0.1:6060/debug/pprof/allocs
```

如果只是想看文本 stack/profile，而不是交给 `go tool pprof`，部分 endpoint 支持 `?debug=1`。

不要把 `?debug=1` 拼到 `go tool pprof` 的 heap URL 后面：那会请求文本格式，而 pprof 正常分析需要 profile 数据。

### 4.3. goroutine

查看 goroutine profile：

```bash
go tool pprof http://127.0.0.1:6060/debug/pprof/goroutine
```

如果只是临时查看 goroutine stack：

```bash
curl 'http://127.0.0.1:6060/debug/pprof/goroutine?debug=2'
```

这对定位 goroutine leak、channel send/receive 卡住、锁等待等问题很实用。

### 4.4. block

先在程序启动阶段设置采样率，例如：

```go
runtime.SetBlockProfileRate(1)
```

然后：

```bash
go tool pprof http://127.0.0.1:6060/debug/pprof/block
```

block profile 会记录在 `Mutex`、`RWMutex`、`WaitGroup`、`Cond`、channel send/receive/select 等同步位置等待的时间。

`rate=1` 会记录所有 blocking event，成本也更高；生产环境应该按实际需要调整采样率。

### 4.5. mutex

启用 mutex contention sampling：

```go
runtime.SetMutexProfileFraction(5)
```

然后：

```bash
go tool pprof http://127.0.0.1:6060/debug/pprof/mutex
```

mutex profile 用于分析 **谁长期持锁，导致其他 goroutine 等待**。

## 5. pprof 的分析顺序

不要一看到服务慢就把所有 profile 全开。

一个简单顺序：

```text
CPU 高
  → CPU profile

RSS / heap 高
  → runtime metrics + heap profile

GC CPU 高
  → allocs / heap + GC metrics

Goroutine 持续增加
  → goroutine profile

吞吐不高但 CPU 又不满
  → block / mutex profile

调度、syscall、GC、并行度或 latency 时间线问题
  → execution trace
```

profile 最有价值的用法通常是**对比**：

```text
正常时 profile
        ↓
异常时 profile
        ↓
比较调用路径 / allocation / contention 的变化
```

## 6. 生产环境安全

`/debug/pprof/` 会暴露程序内部 stack、函数名、运行状态等调试信息。

不要直接把它暴露到公网。更安全的方式包括：

- 只监听 `127.0.0.1`；
- 放在内部管理端口；
- 通过认证 / ACL / VPN / SSH tunnel 访问；
- 采集完成后再离线分析。

## 7. pprof 与 benchmark

benchmark 用于构造**可重复的局部 workload**，pprof 用于找这个 workload 中的热点，两者经常一起使用：

[benchmark.md](/notes/go/benchmark/)

例如：

```bash
go test -bench=. -cpuprofile=cpu.out -memprofile=mem.out

go tool pprof cpu.out
go tool pprof mem.out
```

## 8. 原理

pprof 的核心是 **sampling**。

它不是逐条记录所有 CPU 指令或每一次内存分配，而是在运行期间采样 stack / allocation / blocking / contention 等事件，再根据样本重建热点分布。

因此：

- profile 是统计结果；
- 样本越少，噪声越大；
- profile 时间过短可能没有代表性；
- profile 本身也有开销；
- 某些采样频率属于 runtime 实现细节，不应该把“固定每 10ms 一次”当成长期 API 保证。

## 9. 参考

- [Go Diagnostics](https://go.dev/doc/diagnostics)
- [runtime/pprof](https://pkg.go.dev/runtime/pprof)
- [net/http/pprof](https://pkg.go.dev/net/http/pprof)
- [Profiling Go Programs](https://go.dev/blog/pprof)
