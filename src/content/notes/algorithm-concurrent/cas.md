---
title: "4.1 Compare-and-Swap（CAS）"
description: "CAS 的基本语义、用途、ABA 问题和 CPU 原子指令实现。"
sourcePath: "Concurrent/CAS.md"
category: "algorithm"
categoryLabel: "Data Structures & Algorithms"
topic: "concurrent-algorithms"
topicLabel: "4.Concurrent Algorithms"
order: 38
tags: ["Algorithm", "Concurrency", "CAS"]
updatedAt: "2026-09-15T11:40:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 什么是CAS
CAS（Compare-and-Swap）是原子操作的一种：把内存中的当前值与期望值比较，相等时再替换为新值。

原笔记用下面的代码描述 CAS 的语义：

```c
int cas(long *addr, long old, long new)
{
    /* Executes atomically. */
    if(*addr != old)
        return 0;
    *addr = new;
    return 1;
}
```

这里是**语义伪代码**。普通 C 代码中的“比较 + 写入”本身并不会自动成为原子操作；真正的 CAS 需要由 CPU 原子指令以及语言/运行时提供的原子 API 保证。

可以把它理解为：检查 `addr` 当前值是不是 `old`；如果相等，就尝试原子地改成 `new` 并返回成功，否则返回失败。

## 2. 为什么需要CAS
用于在多线程编程中实现不被其他线程观察到中间状态的原子比较交换，常用于实现原子变量和无锁算法。

CAS 失败后是否重试由具体算法决定；CAS 本身不等于完整的无锁算法。

## 3. CAS问题
### 3.1. ABA
如果一个值经历 `A → B → A`，仅比较最终值的 CAS 仍可能认为它“没有变化”。这就是 ABA 问题。

常见处理思路是给状态增加版本号，或者在指针型无锁结构中配合安全的内存回收机制。

## 4. CAS实现
CAS 操作通常基于 CPU 提供的原子读-改-写指令，并由语言的原子 API 封装。

不同语言还可能要求调用者选择相应的内存序；这是原子 API 的附加语义，不改变这里最初记录的 CAS 核心概念。

## 5. 参考
- [比较并交换 - 维基百科](https://zh.m.wikipedia.org/zh-sg/%E6%AF%94%E8%BE%83%E5%B9%B6%E4%BA%A4%E6%8D%A2)
