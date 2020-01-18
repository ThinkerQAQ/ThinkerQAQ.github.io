[toc]

 

## 数据结构

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230135600.png)
有两个指针，一个标记读的位置，一个标记写的位置。
0 < 读 < 写 < capacity
其中0到读之间的数据是无效的，读到写之间的数据是可读的，写到capacity之间是可写的

## Api

readXXX表示读数据，读指针往后移动
writeXXX表示写数据，写指针往后移动
set不移动指针，只是改变数据

mark记录当前读指针的位置，将来可以通过reset回溯

## 类体系

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230135452.png)
ByteBuf都是一些抽象的方法
而AbstractByteBuf则是提供了一些基础骨架的实现
- 比如getByte
就是检查了下索引是否正确，然后调用子类实现的getByte
```java
@Override
public byte getByte(int index) {
    checkIndex(index);
    return _getByte(index);
}

protected abstract byte _getByte(int index);
```


### 分类
主要可以按照三个维度分类

#### pooled和unpooled
操作数据是否在预先分配的内存中的

#### unsafe和非unsafe
是否使用了jdk底层的nio进行操作

我们以PooledUnsafeHeapByteBuf为例，看看他的_getByte方法
```java
protected byte _getByte(int index) {
    return UnsafeByteBufUtil.getByte(memory, idx(index));
}

static byte getByte(byte[] array, int index) {
    return PlatformDependent.getByte(array, index);
}

public static byte getByte(byte[] data, int index) {
    return PlatformDependent0.getByte(data, index);
}

static byte getByte(byte[] data, int index) {
	//最后调用了Unsafe
    return UNSAFE.getByte(data, BYTE_ARRAY_BASE_OFFSET + index);
}
```

再对比PooledHeapByteBuf的_getByte
```java
protected byte _getByte(int index) {
    return HeapByteBufUtil.getByte(memory, idx(index));
}

static byte getByte(byte[] memory, int index) {
	//没有调用unsafe，直接数组读取
    return memory[index];
}
```


#### heap和direct
内存是在jvm堆上还是直接才OS内存上分配的

我们以UnPooledHeapByteBuf的getByte为例
```java
public byte getByte(int index) {
    ensureAccessible();
    return _getByte(index);
}

protected byte _getByte(int index) {
    return HeapByteBufUtil.getByte(array, index);
}

static byte getByte(byte[] memory, int index) {
	//再数组上读取，说明是在堆上
    return memory[index];
}

```
对比UnPooledDirectByteBuf
```java
public byte getByte(int index) {
    ensureAccessible();
    return _getByte(index);
}


protected byte _getByte(int index) {
	//这个buffer是jdk nio的buffer
	//可以看看Unpooled的directBuffer
    return buffer.get(index);
}

```

- Unpooled的directBuffer

```java
public static ByteBuf directBuffer(int initialCapacity) {
    return ALLOC.directBuffer(initialCapacity);
}

public ByteBuf directBuffer(int initialCapacity) {
    return directBuffer(initialCapacity, DEFAULT_MAX_CAPACITY);
}

public ByteBuf directBuffer(int initialCapacity, int maxCapacity) {
    if (initialCapacity == 0 && maxCapacity == 0) {
        return emptyBuf;
    }
    validate(initialCapacity, maxCapacity);
    return newDirectBuffer(initialCapacity, maxCapacity);
}

protected ByteBuf newDirectBuffer(int initialCapacity, int maxCapacity) {
    final ByteBuf buf;
    if (PlatformDependent.hasUnsafe()) {
    	//这里
        buf = noCleaner ? new InstrumentedUnpooledUnsafeNoCleanerDirectByteBuf(this, initialCapacity, maxCapacity) :
                new InstrumentedUnpooledUnsafeDirectByteBuf(this, initialCapacity, maxCapacity);
    } else {
        buf = new InstrumentedUnpooledDirectByteBuf(this, initialCapacity, maxCapacity);
    }
    return disableLeakDetector ? buf : toLeakAwareBuffer(buf);
}
//。。。。

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
	//ByteBuffer.allocateDirect(initialCapacity)
	//jdk底层nio分配直接内存
    setByteBuffer(allocateDirect(initialCapacity), false);
}
```

