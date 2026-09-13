---
title: "2.13 concurrent"
description: "Go 并发同步与内存模型：goroutine/channel、happens-before、DRF-SC、channel/lock/Once/atomic 的同步保证，以及 race detector。"
sourcePath: "Golang/concurrent.md"
category: "go"
categoryLabel: "Go"
topic: "concurrency"
topicLabel: "2.Concurrency"
order: 26
tags: ["Golang"]
createdAt: "2020-05-05T07:26:00Z"
updatedAt: "2022-11-19T11:55:27Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. Go 的并发工具

### 1.1. goroutine + channel

- [goroutine.md](/notes/go/goroutine/)
- [channel.md](/notes/go/channel/)

### 1.2. sync / atomic

- [sync.md](/notes/go/sync/)
- [atomic.md](/notes/go/atomic/)

## 2. Go Memory Model

这篇旧笔记原来把 Go 的同步规则简化成“顺序一致性 + happens-before”。更准确的理解应该是：

1. **单个 goroutine 内部**，执行必须符合语言定义的 `sequenced before` 顺序；
2. **不同 goroutine 之间**，需要通过 channel、lock、atomic 等同步操作建立 `synchronized before`；
3. `sequenced before` 和 `synchronized before` 的传递闭包构成 `happens before`；
4. 没有 data race 的 Go 程序具有 **DRF-SC（data-race-free sequential consistency）**：可以像所有 goroutine 的操作被某种顺序交错执行一样推理。

因此，真正应该记住的不是“goroutine 天然有顺序一致性”，而是：

> **共享内存需要同步。没有同步的并发读写就是 data race。**

如果同一内存位置被多个 goroutine 并发访问，并且至少一个访问是普通写，而这些访问之间没有足够的同步关系，就存在 data race。

开发时可以直接使用 race detector：

```bash
go test -race ./...
go run -race main.go
go build -race ./...
```

## 3. channel 的 happens-before 规则

### 3.1. send → receive

对任意 channel：

> 一次 send **synchronized before** 与它对应的 receive 完成。

例如：

```go
var a string
var ch = make(chan struct{}, 1)

func f() {
    a = "hello"
    ch <- struct{}{}
}

func main() {
    go f()
    <-ch
    println(a) // 保证看到 "hello"
}
```

这里：

```text
a = "hello"
    ↓ sequenced before
ch <- struct{}{}
    ↓ synchronized before
<-ch 完成
    ↓ sequenced before
println(a)
```

因此写入 `a` happens-before 后面的读取。

### 3.2. close → closed receive

关闭 channel synchronized-before 一个因为 channel 已关闭而返回零值的 receive。

所以 channel close 也经常被用于广播“完成”信号。

### 3.3. unbuffered channel 的反向同步边

对 **无缓冲 channel**：

> receive synchronized-before 对应的 send 完成。

这个规则解释了为什么无缓冲 channel 是一次 rendezvous：发送方和接收方必须在同一次通信上会合。

### 3.4. buffered channel 的容量规则

假设 channel 容量是 `C`：

> 第 `k` 次 receive synchronized-before 第 `k+C` 次 send 完成。

这个规则非常重要，因为 buffered channel 常被用作 semaphore：

```go
limit := make(chan struct{}, 3)

for _, job := range jobs {
    go func(job Job) {
        limit <- struct{}{} // acquire
        defer func() { <-limit }() // release

        work(job)
    }(job)
}
```

最多只有 3 个 goroutine 能同时越过 acquire。

## 4. 其他同步原语

### 4.1. Mutex / RWMutex

对于同一个 `sync.Mutex` 或 `sync.RWMutex`：

> 较早一次 `Unlock` synchronized-before 较晚一次 `Lock` 返回。

因此临界区中对共享状态的写入，可以被后续成功获取同一把锁的 goroutine 看见。

### 4.2. sync.Once

`once.Do(f)` 中那一次真正执行的 `f()` 完成，synchronized-before 任意一次 `once.Do(f)` 返回。

因此 `sync.Once` 可以安全地发布初始化完成后的数据。

### 4.3. sync/atomic

Go 的 atomic 操作本身也属于同步操作。

如果 atomic 操作 A 的效果被 atomic 操作 B 观察到，那么 A synchronized-before B；所有 atomic 操作表现得像处于某一个 **sequentially consistent order** 中。

具体 API 和实现见：[atomic.md](/notes/go/atomic/)

## 5. 不要依赖“看起来有顺序”

下面这种代码没有同步：

```go
var a string
var done bool

func setup() {
    a = "hello"
    done = true
}

func main() {
    go setup()

    for !done {
    }

    println(a)
}
```

即使某次运行里看见了 `done == true`，也不能据此建立对 `a` 的 happens-before 保证；这个程序本身就存在 data race。

正确做法是使用：

- channel；
- `sync.Mutex` / `sync.RWMutex`；
- `sync.Once`；
- `sync.WaitGroup` 等带明确定义同步语义的抽象；
- `sync/atomic`。

## 6. 并发模式

- [扇入扇出 · Concurrency in Go 中文笔记 · 看云](https://www.kancloud.cn/mutouzhang/go/596844)

## 7. 多核 CPU

- [Go语言多核并行化](http://c.biancheng.net/view/4362.html?utm_source=pocket_saves)
- [PythonWise: CPU Affinity in Go](http://pythonwise.blogspot.com/2019/03/cpu-affinity-in-go.html?utm_source=pocket_saves)
- [tsingson/cpuaffinity: pin goroutine to cpu core as thread](https://github.com/tsingson/cpuaffinity?utm_source=pocket_saves)

CPU affinity 属于更底层、平台相关的优化手段。普通 Go 并发程序首先应该让 runtime scheduler 管理 goroutine 和 OS thread，只有明确的性能/实时性需求才考虑绑定线程或 CPU。

## 8. 参考

- [The Go Memory Model](https://go.dev/ref/mem)
- [Data Race Detector](https://go.dev/doc/articles/race_detector)
- [Effective Go - Concurrency](https://go.dev/doc/effective_go#concurrency)
