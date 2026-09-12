---
title: "3.8 Golang栈管理"
description: "1. 栈是什么 - 空间小，数据存放时间较短暂。栈在高地址，从高地址向低地址增长 - 分配：函数调用自动分配 - 回收：函数返回自动回收 2. Golang栈的特点 2.1. 动态扩容 - go runtime不是给每个goroutine分配固定的空间，而是需要的动态分配栈空间 - 创建gorout"
sourcePath: "Golang/Golang栈管理.md"
category: "go"
categoryLabel: "Go"
topic: "runtime"
topicLabel: "3.Runtime"
order: 36
tags: ["Golang"]
createdAt: "2022-03-20T07:16:43Z"
updatedAt: "2022-03-20T07:24:05Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 0. 版本说明（2026）

这是一篇 2022 年的历史学习笔记。核心结论“goroutine 使用可增长、可收缩的连续栈”仍然成立，但“新 goroutine 固定分配 8KB 栈”已经不正确。

当前 runtime 中，Go 代码使用的最小栈大小 `stackMin` 是 **2KiB**。新 goroutine 的实际起始栈由 `startingStackSize` 决定；runtime 会在 GC 后根据近期扫描到的 goroutine 栈平均大小动态调整这个起始值，所以不能再把它理解成一个固定的 8KB 常量。

## 1. 栈是什么
- 栈用于保存函数调用相关的数据，例如局部变量、返回地址和调用帧。
- 分配和回收通常随着函数调用、返回自动进行。
- “高地址向低地址增长”是很多体系结构/ABI中的常见实现，不应该当成Go语言层面的保证。goroutine栈本身由runtime管理，理解Go栈时更重要的是它能够动态增长和收缩。

## 2. Golang栈的特点

### 2.1. 动态扩容
- Go runtime不是给每个goroutine永久分配一块固定大小的栈，而是让goroutine栈根据实际使用动态增长、收缩。
- 当前runtime中`stackMin = 2048`，新goroutine的起始栈大小至少不小于这个最小值。
- `startingStackSize`会根据GC扫描到的goroutine栈平均大小动态调整：
    - 起始栈太小，后续仍然可以扩容；
    - 起始栈太大，后续仍然可以缩容。
- 函数入口处的栈边界检查与`morestack`/`newstack`机制共同完成栈增长。

### 2.2. 连续栈 vs 分段栈
- Go 1.3 版本前使用的栈结构是分段栈，之后使用连续栈。
- 分段栈：
    - 扩容：创建新的栈段并把多个栈段串起来。
    - 问题：容易出现“hot split”，例如循环中反复跨越栈边界时频繁扩容、回收。
- 连续栈：
    - 扩容时申请更大的连续栈空间；
    - `runtime.copystack`把旧栈内容复制到新栈，并修正指向旧栈对象的相关指针；
    - 完成切换后回收旧栈空间。

## 3. 参考
- [runtime/stack.go](https://go.dev/src/runtime/stack.go)
- [Go语言的栈空间管理 \- 知乎](https://zhuanlan.zhihu.com/p/28484133)
- [Go 语言内存管理三部曲（二）解密栈内存管理 \- InfoQ 写作平台](https://xie.infoq.cn/article/530c735982a391604d0eebe71)
- [连续栈 · 深入解析Go](https://tiancaiamao.gitbooks.io/go-internals/content/zh/03.5.html)