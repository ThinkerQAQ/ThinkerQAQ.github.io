---
title: "4.5 trace"
description: "Go execution trace：采集 goroutine 调度、syscall、GC 和并行度时间线，使用 runtime/trace、go test -trace、net/http/pprof/trace，以及 Go 1.25+ FlightRecorder。"
sourcePath: "Golang/trace.md"
category: "go"
categoryLabel: "Go"
topic: "performance"
topicLabel: "4.Performance"
order: 42
tags: ["Golang"]
createdAt: "2022-11-19T11:56:05Z"
updatedAt: "2022-11-20T08:03:06Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. trace 是什么

Go execution trace 记录一段时间内 runtime 的执行事件，例如：

- goroutine 创建、运行、阻塞、唤醒；
- goroutine 在不同 P / OS thread 上的调度；
- syscall；
- GC；
- heap size 变化；
- processor start / stop；
- 用户自己标记的 task、region、log。

它最适合回答的是**时间线问题**：

> 为什么 goroutine 在这一段时间没有运行？CPU 有没有真正并行起来？延迟花在 scheduler、channel、syscall 还是 GC？

如果只是找“哪个函数 CPU 最热”“哪条调用链分配内存最多”，通常优先使用 [pprof.md](/notes/go/pprof/)。

## 2. standalone 程序采集

使用 `runtime/trace`：

```go
package main

import (
    "fmt"
    "os"
    "runtime/trace"
)

func main() {
    f, err := os.Create("trace.out")
    if err != nil {
        panic(err)
    }
    defer f.Close()

    if err := trace.Start(f); err != nil {
        panic(err)
    }
    defer trace.Stop()

    fmt.Println("Hello World")
}
```

分析：

```bash
go tool trace trace.out
```

`trace.Stop()` 会等 trace 数据写完，所以正常写法应该确保它一定执行，例如使用 `defer`。

## 3. 测试和 benchmark

`go test` 原生支持 trace：

```bash
go test -trace=trace.out ./...
```

只跑指定测试：

```bash
go test -run TestFoo -trace=trace.out ./path/to/pkg
```

对于“某个测试为什么并行度差 / 大量阻塞 / GC 明显”的问题，这种方式比在代码里手工插 `trace.Start` 更方便。

## 4. 在线服务采集

如果服务已经启用了 `net/http/pprof`：

```go
import _ "net/http/pprof"
```

可以直接采集 execution trace：

```bash
curl -o trace.out 'http://127.0.0.1:6060/debug/pprof/trace?seconds=5'

go tool trace trace.out
```

和 pprof 一样，`/debug/pprof/` 不应该直接暴露到公网。

## 5. trace 主要看什么

### 5.1. goroutine 调度

trace 能看到 goroutine 什么时候：

```text
Runnable
   ↓
Running
   ↓
Blocked / syscall / waiting
   ↓
Runnable
```

因此它特别适合定位：

- 大量 goroutine runnable，但迟迟拿不到 CPU；
- goroutine 长时间卡在 channel / sync；
- syscall 导致的等待；
- 程序只有少量 P 真正在工作，导致并行度不足。

### 5.2. GC

trace 中可以把 GC 事件和业务 goroutine 放在同一条时间线上观察，例如：

- GC 在什么时候开始；
- mark / STW 与业务延迟是否重合；
- heap 是否持续增长；
- GC 期间 CPU utilization 如何变化。

### 5.3. latency

pprof 主要给你“统计热点”，trace 更容易回答：

```text
这个请求为什么这一秒特别慢？
```

例如某个 goroutine 自己没有消耗很多 CPU，但因为锁、channel、scheduler 或 syscall 等了 500ms，CPU profile 未必能直接指出这个 500ms；execution trace 的时间线更适合观察这种情况。

## 6. 用户级 annotation

runtime trace 不只能看 runtime 自己的事件，也可以把业务逻辑标进去。

### 6.1. Region

```go
ctx := context.Background()

defer trace.StartRegion(ctx, "load-cache").End()
loadCache()
```

### 6.2. Task

```go
ctx, task := trace.NewTask(context.Background(), "handle-request")
defer task.End()

trace.WithRegion(ctx, "query-db", func() {
    queryDB()
})
```

这能把：

```text
业务阶段
    ↓
runtime scheduler / GC / syscall
```

放到同一条时间线上分析。

## 7. Go 1.22 之后的 execution tracer

Go 1.22 对 execution tracer 做过一次大规模重构：

- trace 可以定期切分成自包含片段；
- tracing 的 start / stop latency 明显下降；
- syscall duration 信息更完整；
- trace 里包含 goroutine 实际运行过的 OS thread 信息；
- tracing overhead 相比早期版本明显降低。

所以这篇 2022 年旧笔记里“trace 很重，只适合非常短的临时采样”这种潜在印象已经不够准确。

但 trace 仍然会产生额外数据和运行时成本，生产环境依旧应该控制窗口大小。

## 8. Go 1.25+ FlightRecorder

传统 `trace.Start` 的问题是：

> 你通常要先知道问题什么时候发生，才能提前开始录制。

Go 1.25 在 `runtime/trace` 中加入 `FlightRecorder`，维护一个**最近一段时间的移动窗口**。

```go
fr := trace.NewFlightRecorder(trace.FlightRecorderConfig{
    MinAge:   10 * time.Second,
    MaxBytes: 64 << 20,
})

if err := fr.Start(); err != nil {
    panic(err)
}
defer fr.Stop()
```

当检测到异常时再 snapshot：

```go
f, err := os.Create("incident.trace")
if err != nil {
    panic(err)
}
defer f.Close()

if _, err := fr.WriteTo(f); err != nil {
    panic(err)
}
```

然后：

```bash
go tool trace incident.trace
```

`MinAge` 是希望至少保留多老的 event，`MaxBytes` 是窗口大小上界提示；`MaxBytes` 优先级更高，而且它不是严格的进程内存上限。

这个能力非常适合：

```text
线上偶发 latency spike
        ↓
平时持续保留最近窗口
        ↓
异常触发时 dump
        ↓
分析异常发生前后的 scheduler / syscall / GC
```

## 9. trace 与 pprof 怎么选

```text
CPU hotspot
    → CPU pprof

heap / allocation hotspot
    → heap / allocs pprof

lock contention 聚合统计
    → mutex / block pprof

goroutine 泄漏
    → goroutine pprof，必要时再配 trace

调度时间线 / syscall / GC / 并行度 / latency
    → execution trace
```

实际排障中，两者经常配合使用，而不是互相替代。

## 10. 参考

- [runtime/trace](https://pkg.go.dev/runtime/trace)
- [Go Diagnostics](https://go.dev/doc/diagnostics)
- [More powerful Go execution traces](https://go.dev/blog/execution-traces-2024)
- [Go 1.22 Release Notes - runtime/trace](https://go.dev/doc/go1.22#runtime)
