[toc]

 

## newDirectBuffer

```java
protected ByteBuf newDirectBuffer(int initialCapacity, int maxCapacity) {
	//从threadLocal中获取各个形成自己的cache
    PoolThreadCache cache = threadCache.get();
    PoolArena<ByteBuffer> directArena = cache.directArena;

    final ByteBuf buf;
    if (directArena != null) {
    	//分配内存
        buf = directArena.allocate(cache, initialCapacity, maxCapacity);
    } else {
        buf = PlatformDependent.hasUnsafe() ?
                UnsafeByteBufUtil.newUnsafeDirectByteBuf(this, initialCapacity, maxCapacity) :
                new UnpooledDirectByteBuf(this, initialCapacity, maxCapacity);
    }

    return toLeakAwareBuffer(buf);
}
```
主要分为两步，第一步时获取PoolThreadCache，进而获取PoolArena，第二步是通过PoolArena分配内存

## 通过PoolThreadLocalCache获取PoolThreadCache

PoolThreadLocalCache其实是一个FastThreadLocal，继承了netty自己实现的FastThreadLocal（就是一个ThreadLocal）
Netty自己的ThreadLocal类比Java的更快
```java
final class PoolThreadLocalCache extends FastThreadLocal<PoolThreadCache> {
    private final boolean useCacheForAllThreads;

    PoolThreadLocalCache(boolean useCacheForAllThreads) {
        this.useCacheForAllThreads = useCacheForAllThreads;
    }

    private <T> PoolArena<T> leastUsedArena(PoolArena<T>[] arenas) {
        if (arenas == null || arenas.length == 0) {
            return null;
        }

        PoolArena<T> minArena = arenas[0];
        for (int i = 1; i < arenas.length; i++) {
            PoolArena<T> arena = arenas[i];
            if (arena.numThreadCaches.get() < minArena.numThreadCaches.get()) {
                minArena = arena;
            }
        }

        return minArena;
    }
}
```


### initialValue
```java
@Override
protected synchronized PoolThreadCache initialValue() {
    final PoolArena<byte[]> heapArena = leastUsedArena(heapArenas);
    final PoolArena<ByteBuffer> directArena = leastUsedArena(directArenas);

    Thread current = Thread.currentThread();
    if (useCacheForAllThreads || current instanceof FastThreadLocalThread) {
        return new PoolThreadCache(
                heapArena, directArena, tinyCacheSize, smallCacheSize, normalCacheSize,
                DEFAULT_MAX_CACHED_BUFFER_CAPACITY, DEFAULT_CACHE_TRIM_INTERVAL);
    }
    // No caching so just use 0 as sizes.
    return new PoolThreadCache(heapArena, directArena, 0, 0, 0, 0, 0);
}
```

可以看出有两个PoolArena，一个用于heap，另一个用于direct，最后构造了一个PoolThreadCache
我们可以看看heapArenas和directArenas的大小是多少
```java
//就是cpu核数的两倍
final int defaultMinNumArena = NettyRuntime.availableProcessors() * 2;
final int defaultChunkSize = DEFAULT_PAGE_SIZE << DEFAULT_MAX_ORDER;
DEFAULT_NUM_HEAP_ARENA = Math.max(0,
        SystemPropertyUtil.getInt(
                "io.netty.allocator.numHeapArenas",
                (int) Math.min(
                        defaultMinNumArena,
                        runtime.maxMemory() / defaultChunkSize / 2 / 3)));
DEFAULT_NUM_DIRECT_ARENA = Math.max(0,
        SystemPropertyUtil.getInt(
                "io.netty.allocator.numDirectArenas",
                (int) Math.min(
                        defaultMinNumArena,
                        PlatformDependent.maxDirectMemory() / defaultChunkSize / 2 / 3)));
```

那么为什么是cpu两倍呢？因为前面创建NIO线程的时候也是cpu两倍，这样每个线程都能独享这个arena

#### 创建PoolThreadCache

## 在PoolThreadLocalCache分配内存


