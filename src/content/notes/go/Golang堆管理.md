---
title: "3.9 Golang堆管理"
description: "1. 堆是什么 - 空间大，数据存放时间较长。堆在低地址，从低地址向高地址增长 - 分配：程序员手动分配 - 回收：GC Go的内存管理是runtime，也就是说并不是每次内存分配都需要进行系统调用。 采用的算法是 TCMalloc 算法，即 Thread-Caching Malloc 。 他把可用"
sourcePath: "Golang/Golang堆管理.md"
category: "go"
categoryLabel: "Go"
topic: "runtime"
topicLabel: "3.Runtime"
order: 37
tags: ["Golang"]
createdAt: "2022-03-20T07:20:07Z"
updatedAt: "2022-03-20T07:33:10Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 0. 版本说明（2026）

这是一篇 2022 年的历史学习笔记。`mcache -> mcentral -> mheap` 这条理解主线仍然有价值，但原文把一些旧版 runtime 的固定地址空间布局当成了稳定设计，需要修正：

- Go allocator **最初基于 TCMalloc，但现在已经有较大差异**，更准确的说法是“受 TCMalloc 启发”。
- `mcache` 是 **per-P**，不是 per-thread / per-M。
- “arena 固定 512GB、bitmap 固定 16GB”属于旧实现细节，当前 runtime 使用一组 heap arenas，并用 arena map 管理整个可寻址堆空间。
- 当前常见 64 位非 Windows 平台的单个 heap arena 是 64MB；Windows 64 位、32 位平台通常是 4MB，Wasm 更小。这些都是 runtime 实现细节，不应作为 Go 语言层面的常量记忆。

## 1. 堆是什么
- Go值是否分配在栈还是堆，主要由编译器的逃逸分析等决定，并不是程序员直接选择“malloc/free”。
- 无法安全放在goroutine栈上的对象会逃逸到Go堆，由runtime分配，并最终由GC管理其生命周期。
- Go runtime维护自己的内存分配器，因此一次Go对象分配通常不需要直接进行一次系统调用。

Go runtime 的内存分配器最初基于 TCMalloc，但已经演化出自己的实现。理解它时可以抓住一个核心：**小对象尽量在P本地完成快速分配，缓存不足时才逐层向全局结构申请，以减少锁竞争和系统调用。**

## 2. 堆内存与arena

当前runtime把堆看成一组arena，并维护arena到元数据的映射。每个arena关联自己的heap bitmap和span map等元数据。

以当前runtime源码为例：

- 大多数64位非Windows平台：单个heap arena为64MB；
- Windows 64位和多数32位平台：通常为4MB；
- Wasm：更小。

因此旧版资料中“启动时预留一个固定512GB arena，再配一个固定16GB bitmap”的图只能作为历史实现理解，不能直接套到当前Go。

## 3. 内存管理单元

- `mspan`：由连续页组成，是堆页管理和对象分配的重要单位。
- 一个span通常服务于某个size class，并切分成多个相同大小的object slot。
- 当前runtime的堆页粒度是8KB。

## 4. 内存分配器

### 4.1. mcache

- `mcache`是**每个P（per-P）**维护的分配缓存，不是每个操作系统线程独占一个。
- 小对象分配优先从当前P的mcache中对应size class的mspan查找空闲slot。
- 这条快速路径通常不需要获取全局锁。

### 4.2. mcentral

- `mcentral`按size class组织可用的mspan。
- 当当前P的mcache中对应mspan没有空间时，会从相应的mcentral获取新的mspan。
- 这里属于多个P共享的中央层级，需要处理并发竞争。

### 4.3. mheap

- `mheap`代表runtime管理的整个Go堆，并按页管理更底层的内存。
- 当mcentral不能提供合适的span时，会继续向mheap申请。
- mheap需要更多虚拟内存/页时，再与操作系统交互。

可以把主路径简化为：

```text
small object
    -> current P.mcache
    -> mcentral
    -> mheap
    -> OS
```

## 5. 逃逸分析

[逃逸分析.md](/notes/go/%E9%80%83%E9%80%B8%E5%88%86%E6%9E%90/)

能安全放在栈上的对象优先使用goroutine栈；生命周期无法在编译期确定、地址逃逸等情况下，对象可能进入堆。

## 6. 内存分配流程

当前runtime仍然区分tiny/small/large allocation，但具体边界和实现属于runtime细节。

当前源码中的主线是：

- **small allocation：≤ 32KB**，按size class分配；
- **tiny allocator：< 16B 且不包含指针的微小对象**，可被合并到tiny block中；
- 超过small object范围的对象走large allocation路径，直接从更底层的页分配结构获取空间。

对学习来说，最值得记住的不是每一个阈值，而是：

1. 编译器先决定对象能否放在栈上；
2. 进入堆后，小对象按size class管理；
3. 当前P优先从mcache分配；
4. 缓存不足时逐层走向mcentral、mheap和OS。

## 7. 参考
- [runtime/malloc.go](https://go.dev/src/runtime/malloc.go)
- [runtime/mpagealloc.go](https://go.dev/src/runtime/mpagealloc.go)
- [图解Go语言内存分配 \| qcrao](https://qcrao.com/2019/03/13/graphic-go-memory-allocation/)
- [可视化Go内存管理 \| Tony Bai](https://tonybai.com/2020/03/10/visualizing-memory-management-in-golang/)
- [Go语言内存管理三部曲（一）内存分配原理 \- InfoQ 写作平台](https://xie.infoq.cn/article/ee1d2416d884b229dfe57bbcc)
- [Go 语言内存分配器的实现原理 \| Go 语言设计与实现](https://draveness.me/golang/docs/part3-runtime/ch07-memory/golang-memory-allocator/)
- [Go: Memory Management and Allocation \| by Vincent Blanchon \| A Journey With Go \| Medium](https://medium.com/a-journey-with-go/go-memory-management-and-allocation-a7396d430f44)
- [🚀 Demystifying memory management in modern programming languages \| Technorage](https://deepu.tech/memory-management-in-programming/)