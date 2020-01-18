[toc]

 

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

