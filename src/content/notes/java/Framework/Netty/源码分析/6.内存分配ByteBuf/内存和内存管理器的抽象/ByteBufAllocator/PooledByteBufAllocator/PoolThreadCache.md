---
title: "2.98 PoolThreadCache"
description: "构造方法 最关键的就是创建了三种大小的MemoryRegionCache，分别是tiny，small，normal"
sourcePath: "Java/Framework/Netty/源码分析/6.内存分配ByteBuf/内存和内存管理器的抽象/ByteBufAllocator/PooledByteBufAllocator/PoolThreadCache.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 100
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 构造方法

```java
private final MemoryRegionCache<byte[]>[] tinySubPageHeapCaches;
private final MemoryRegionCache<byte[]>[] smallSubPageHeapCaches;
private final MemoryRegionCache<ByteBuffer>[] tinySubPageDirectCaches;
private final MemoryRegionCache<ByteBuffer>[] smallSubPageDirectCaches;
private final MemoryRegionCache<byte[]>[] normalHeapCaches;
private final MemoryRegionCache<ByteBuffer>[] normalDirectCaches;

//..
tinySubPageDirectCaches = createSubPageCaches(
        tinyCacheSize, PoolArena.numTinySubpagePools, SizeClass.Tiny);
smallSubPageDirectCaches = createSubPageCaches(
        smallCacheSize, directArena.numSmallSubpagePools, SizeClass.Small);

numShiftsNormalDirect = log2(directArena.pageSize);
normalDirectCaches = createNormalCaches(
        normalCacheSize, maxCachedBufferCapacity, directArena);
//...

```

最关键的就是创建了三种大小的MemoryRegionCache，分别是tiny，small，normal
