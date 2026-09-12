---
title: "3.1 GMP"
description: "1. goroutine调度器 - Golang中协程的调度模型，即有M个线程，N个协程，该怎么分配协程给线程执行 - 这个本质上和操作系统的调度器类似，即有M个处理器，N个线程，怎么分配处理器给线程执行 1.1. GM模型 - 最开始采用的是GM模型 - G：goroutine，M：内核线程 - "
sourcePath: "Golang/GMP.md"
category: "go"
categoryLabel: "Go"
topic: "runtime"
topicLabel: "3.Runtime"
order: 29
tags: ["Golang"]
createdAt: "2020-08-06T14:47:03Z"
updatedAt: "2022-05-03T06:15:49Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 0. 版本说明（2026）

这是一篇 2020～2022 年的历史学习笔记，G / M / P 的主线仍然成立，但两个实现细节需要更新：

- `runtime/debug.SetMaxThreads` 的 **10000** 是操作系统线程数量的初始上限，不是 runtime 默认创建 10000 个 M；M 会按运行需要创建和复用。
- Go 1.14 起 goroutine 已支持异步抢占。当前 runtime 同时存在阻塞、安全点检查和异步安全点等抢占机会，不能再理解成“只有系统调用或运行很久才可能被抢占”。

## 1. goroutine调度器
- Golang中协程的调度模型，即有M个线程，N个协程，该怎么分配协程给线程执行
- 这个本质上和操作系统的调度器类似，即有M个处理器，N个线程，怎么分配处理器给线程执行


### 1.1. GM模型
- 最开始采用的是GM模型
    - G：goroutine，M：内核线程
    - 这个模型中，所有的G放在全局队列中，M从全局队列中取出和放回G需要加锁
    - 问题：
        - 加锁效率低
        - 局部性差
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1596870337_20200806231106669_473.png)



### 1.2. GMP模型
- 为了解决GM模型的缺点，推出了GMP模型。M绑定到P，P有个本地队列存放着goroutine，M从中取出goroutine执行；如果P的本地队列为空，那么从全局队列或者其他P偷取
- 一句话：M需要获得P才能运行G
- ![](https://raw.githubusercontent.com/TDoct/images/master/1596870339_20200808144742151_25089.png)

#### 1.2.1. P
- Processor，抽象的处理器。
- `GOMAXPROCS`环境变量或者`runtime.GOMAXPROCS()`设置的是会有多少个操作系统的线程同时执行Go的代码，即GMP中P的数量。
#### 1.2.2. M
- Machine，对应操作系统线程。
- M由runtime按需创建和复用，并不是“默认创建1万个M”。`runtime/debug.SetMaxThreads`控制的是Go程序可使用的操作系统线程上限，初始值是10000。
- 当有goroutine需要运行，而现有线程都阻塞在系统调用、cgo调用，或被`runtime.LockOSThread`绑定时，runtime可能创建新的操作系统线程。
- 空闲的M可以休眠，之后继续被调度器复用。
#### 1.2.3. G
- Goroutine，协程。
- 执行用户代码
- `runtime.NumGoroutine()`获取当前总的协程数量，即GMP中的G
- 也可以通过[pprof.md](/notes/go/pprof/)来获取G的数量






## 2. 调度器创建goroutine流程
![](https://raw.githubusercontent.com/TDoct/images/master/1596870369_20200808150400637_4230.png)


### 2.1. 初始化M0和G0
- M0
    - 启动程序后的**编号为0**的主线程
    - 负责执行初始化操作和**启动第一个G**
- G0
    - 每个M都有一个特殊的g0
    - 作用
        - 执行调度器和runtime内部工作
        - 处理栈增长等需要切换到系统栈的工作

### 2.2. go func执行流程
![](https://raw.githubusercontent.com/TDoct/images/master/1596870366_20200808150211834_12928.png)



## 3. 抢占式调度
早期Go调度更依赖协作式安全点。为了避免某个goroutine长期占用P，runtime后来不断增强抢占能力。

Go 1.14开始支持异步抢占，即使循环中没有函数调用，也不再天然成为长时间不可抢占区域。当前可以把抢占机会粗略理解为三类：

- goroutine阻塞、等待同步或进入系统调用时的阻塞安全点；
- 函数序言等位置主动检查抢占请求的同步安全点；
- runtime通过操作系统机制（例如Unix信号）暂停线程，并在可安全扫描的位置进行异步抢占。

因此，“运行较长时间后由后台线程通知goroutine调度”只能作为早期实现的简化理解，不适合作为当前Go调度器的完整模型。


## 4. 参考
- [Go 1.14 Release Notes](https://go.dev/doc/go1.14)
- [runtime/preempt.go](https://go.dev/src/runtime/preempt.go)
- [runtime/debug.SetMaxThreads](https://pkg.go.dev/runtime/debug#SetMaxThreads)
- [\[典藏版\] Golang 调度器 GMP 原理与调度全分析 \| Go 技术论坛](https://learnku.com/articles/41728)
- [Go: g0, Special Goroutine\. ℹ️ This article is based on Go 1\.13\. \| by Vincent Blanchon \| A Journey With Go \| Medium](https://medium.com/a-journey-with-go/go-g0-special-goroutine-8c778c6704d8)
- [抢占式调度 · 深入解析Go](https://tiancaiamao.gitbooks.io/go-internals/content/zh/05.5.html)
- [Go 运行程序中的线程数 \| 鸟窝](https://colobu.com/2020/12/20/threads-in-go-runtime/#:~:text=%E4%BD%86%E6%98%AF%EF%BC%8C%E7%B3%BB%E7%BB%9F%E7%9A%84%E7%BA%BF%E7%A8%8B%E4%B9%9F,%E9%BB%98%E8%AE%A4%E6%98%AF10000%E4%B8%AA%E7%BA%BF%E7%A8%8B%E3%80%82)