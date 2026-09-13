---
title: "2.89 ByteBufAllocator"
description: "类体系 分配内存的工具类 ByteBufAllocator 这里的api只能区分heap还是direct，另外两个维度由AbstractByteBufAllocator的buffer方法实现 AbstractByteBufAllocator buffer方法 我们看看他的buffer方法 分配直接内"
sourcePath: "Java/Framework/Netty/源码分析/6.内存分配ByteBuf/内存和内存管理器的抽象/ByteBufAllocator.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 91
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## ByteBufAllocator类体系

分配内存的工具类
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230135625.png)

## ByteBufAllocator

这里的api只能区分heap还是direct，另外两个维度由AbstractByteBufAllocator的buffer方法实现

```java
buffer//用于分配buffer

ioBuffer//用于分配适用于io的buffer

heapBuffer//用于分配在heap上的buffer

directBuffer//用于分配直接内存的buffer

//组合多种buffer
compositeBuffer
compositeHeapBuffer
compositeDirectBuffer
```


## AbstractByteBufAllocator


### buffer方法
我们看看他的buffer方法
```java
public ByteBuf buffer() {
	//分配直接内存
    if (directByDefault) {
        return directBuffer();
    }
	//分配堆内存
    return heapBuffer();
}

```


#### 分配直接内存
```java
public ByteBuf directBuffer() {
	//初始容量是多少，最大扩容到多少
    return directBuffer(DEFAULT_INITIAL_CAPACITY, DEFAULT_MAX_CAPACITY);
}

public ByteBuf directBuffer(int initialCapacity, int maxCapacity) {
    if (initialCapacity == 0 && maxCapacity == 0) {
        return emptyBuf;
    }
    validate(initialCapacity, maxCapacity);
	//调用子类的方法，可以是Pooled也可以是Unpooled
    return newDirectBuffer(initialCapacity, maxCapacity);
}
```


#### 分配堆内存
```java
public ByteBuf heapBuffer() {
    return heapBuffer(DEFAULT_INITIAL_CAPACITY, DEFAULT_MAX_CAPACITY);
}

public ByteBuf heapBuffer(int initialCapacity, int maxCapacity) {
    if (initialCapacity == 0 && maxCapacity == 0) {
        return emptyBuf;
    }
    validate(initialCapacity, maxCapacity);
    //调用子类的方法，可以是Pooled也可以是Unpooled
    return newHeapBuffer(initialCapacity, maxCapacity);
}
```


## UnpooledByteBufAllocator


### newHeapBuffer
```java
protected ByteBuf newHeapBuffer(int initialCapacity, int maxCapacity) {
	//根据是否由unsafe类决定是否使用unsafe分配内存
    return PlatformDependent.hasUnsafe() ?
            new InstrumentedUnpooledUnsafeHeapByteBuf(this, initialCapacity, maxCapacity) :
            new InstrumentedUnpooledHeapByteBuf(this, initialCapacity, maxCapacity);
}
```


先看看由unsafe的InstrumentedUnpooledUnsafeHeapByteBuf
```java
InstrumentedUnpooledUnsafeHeapByteBuf(UnpooledByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
	//UnpooledUnsafeHeapByteBuf
    super(alloc, initialCapacity, maxCapacity);
}

UnpooledUnsafeHeapByteBuf(ByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
	//UnpooledHeapByteBuf
    super(alloc, initialCapacity, maxCapacity);
}

public UnpooledHeapByteBuf(ByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
    super(maxCapacity);

    checkNotNull(alloc, "alloc");

    if (initialCapacity > maxCapacity) {
        throw new IllegalArgumentException(String.format(
                "initialCapacity(%d) > maxCapacity(%d)", initialCapacity, maxCapacity));
    }

    this.alloc = alloc;
    //heap上的是new byte[initialCapacity]
    setArray(allocateArray(initialCapacity));
    setIndex(0, 0);
}
```




### newDirectBuffer
```java
protected ByteBuf newDirectBuffer(int initialCapacity, int maxCapacity) {
    final ByteBuf buf;
    //根据是否由unsafe类决定是否使用unsafe分配内存
    if (PlatformDependent.hasUnsafe()) {
        buf = noCleaner ? new InstrumentedUnpooledUnsafeNoCleanerDirectByteBuf(this, initialCapacity, maxCapacity) :
                new InstrumentedUnpooledUnsafeDirectByteBuf(this, initialCapacity, maxCapacity);
    } else {
        buf = new InstrumentedUnpooledDirectByteBuf(this, initialCapacity, maxCapacity);
    }
    return disableLeakDetector ? buf : toLeakAwareBuffer(buf);
}

```


#### 有unsafe
```java
InstrumentedUnpooledUnsafeNoCleanerDirectByteBuf(
        UnpooledByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
	//UnpooledUnsafeNoCleanerDirectByteBuf
    super(alloc, initialCapacity, maxCapacity);
}

public UnpooledUnsafeDirectByteBuf(ByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
    super(maxCapacity);
    if (alloc == null) {
        throw new NullPointerException("alloc");
    }
    if (initialCapacity < 0) {
        throw new IllegalArgumentException("initialCapacity: " + initialCapacity);
    }
    if (maxCapacity < 0) {
        throw new IllegalArgumentException("maxCapacity: " + maxCapacity);
    }
    if (initialCapacity > maxCapacity) {
        throw new IllegalArgumentException(String.format(
                "initialCapacity(%d) > maxCapacity(%d)", initialCapacity, maxCapacity));
    }

    this.alloc = alloc;
    //direct的是ByteBuffer.allocateDirect(initialCapacity);
    setByteBuffer(allocateDirect(initialCapacity), false);
}

final void setByteBuffer(ByteBuffer buffer, boolean tryFree) {
    if (tryFree) {
        ByteBuffer oldBuffer = this.buffer;
        if (oldBuffer != null) {
            if (doNotFree) {
                doNotFree = false;
            } else {
                freeDirect(oldBuffer);
            }
        }
    }
    this.buffer = buffer;
	//这里是个重点，最终通过UNSAFE.getLong(object, fieldOffset);
    memoryAddress = PlatformDependent.directBufferAddress(buffer);
    tmpNioBuf = null;
    capacity = buffer.remaining();
}
```


#### 没有unsafe
```java
InstrumentedUnpooledDirectByteBuf(
        UnpooledByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
    super(alloc, initialCapacity, maxCapacity);
}

public UnpooledDirectByteBuf(ByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
    super(maxCapacity);
    if (alloc == null) {
        throw new NullPointerException("alloc");
    }
    if (initialCapacity < 0) {
        throw new IllegalArgumentException("initialCapacity: " + initialCapacity);
    }
    if (maxCapacity < 0) {
        throw new IllegalArgumentException("maxCapacity: " + maxCapacity);
    }
    if (initialCapacity > maxCapacity) {
        throw new IllegalArgumentException(String.format(
                "initialCapacity(%d) > maxCapacity(%d)", initialCapacity, maxCapacity));
    }

    this.alloc = alloc;
    //new DirectByteBuffer(capacity)
    setByteBuffer(ByteBuffer.allocateDirect(initialCapacity));
}

private void setByteBuffer(ByteBuffer buffer) {
    ByteBuffer oldBuffer = this.buffer;
    if (oldBuffer != null) {
        if (doNotFree) {
            doNotFree = false;
        } else {
            freeDirect(oldBuffer);
        }
    }

	//没有unsafe只是保存buffer罢了
    this.buffer = buffer;
    tmpNioBuf = null;
    capacity = buffer.remaining();
}
```


## PooledByteBufAllocator

[+PooledByteBufAllocator](/notes/java/Framework/Netty/%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90/6.%E5%86%85%E5%AD%98%E5%88%86%E9%85%8DByteBuf/%E5%86%85%E5%AD%98%E5%92%8C%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86%E5%99%A8%E7%9A%84%E6%8A%BD%E8%B1%A1/ByteBufAllocator/PooledByteBufAllocator/)
