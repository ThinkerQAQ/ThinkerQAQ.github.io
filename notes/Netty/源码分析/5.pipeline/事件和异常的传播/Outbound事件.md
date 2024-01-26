[toc]

 

## 1. 添加handler以便实验

- OutboundHandlerA、OutboundHandlerC
```java
package com.zsk.server.handler;

import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelOutboundHandlerAdapter;
import io.netty.channel.ChannelPromise;

/**
 * @description:
 * @author: zsk
 * @create: 2019-12-10 23:08
 **/
public class OutboundHandlerA extends ChannelOutboundHandlerAdapter
{
    @Override
    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception
    {
        System.out.println(this.getClass().getSimpleName() + ":" + msg);
        ctx.write(msg, promise);
    }
}
```


- OutboundHandlerB
```java
package com.zsk.server.handler;

import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelOutboundHandlerAdapter;
import io.netty.channel.ChannelPromise;

import java.util.concurrent.TimeUnit;

/**
 * @description:
 * @author: zsk
 * @create: 2019-12-10 23:08
 **/
public class OutboundHandlerB extends ChannelOutboundHandlerAdapter
{
    @Override
    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception
    {
        System.out.println(this.getClass().getSimpleName() + ":" + msg);
        ctx.write(msg, promise);
    }

    @Override
    public void handlerAdded(ChannelHandlerContext ctx) throws Exception
    {
        ctx.executor().schedule(()->{
            ctx.channel().writshoue("Hello World");
        },3, TimeUnit.SECONDS);
    }
}
```


- NettyServer
```java
.childHandler(new ChannelInitializer<SocketChannel>()
{
    @Override
    protected void initChannel(SocketChannel channel) throws Exception
    {
        ChannelPipeline pipeline = channel.pipeline();
        pipeline.addLast(new OutboundHandlerA())
                .addLast(new OutboundHandlerC())
                .addLast(new OutboundHandlerB());
    }
});
```


### 1.1. 使用nc连接
```java
nc localhost 8000
```


### 1.2. 输出结果
```java
OutboundHandlerB:Hello World
OutboundHandlerC:Hello World
OutboundHandlerA:Hello World
```


### 1.3. 解释
可以看出是从尾巴往头部调用我们的handler

## 2. 从pipeline开始调用

我们在OutboundHandlerB的handlerAdded打上断点，使用nc连接，开始debug调试，首先会进入
AbstractChannel#write
```java
public ChannelFuture write(Object msg) {
    return pipeline.write(msg);
}

```
数据传入pipeline进行传播

## 3. 先是进入TailContext

DefaultChannelPipeline#write
```java
public final ChannelFuture write(Object msg) {
    return tail.write(msg);
}
```

然后通过AbstractChannelHandlerContext进行转发

### 3.1. 通过AbstractChannelHandlerContext进行转发
AbstractChannelHandlerContext#write
```java
public ChannelFuture write(Object msg) {
    return write(msg, newPromise());
}

public ChannelFuture write(final Object msg, final ChannelPromise promise) {
    if (msg == null) {
        throw new NullPointerException("msg");
    }

    try {
        if (isNotValidPromise(promise, true)) {
            ReferenceCountUtil.release(msg);
            // cancelled
            return promise;
        }
    } catch (RuntimeException e) {
        ReferenceCountUtil.release(msg);
        throw e;
    }
	//这里
    write(msg, false, promise);

    return promise;
}

private void write(Object msg, boolean flush, ChannelPromise promise) {
	//找到下一个节点
    AbstractChannelHandlerContext next = findContextOutbound();
    final Object m = pipeline.touch(msg, next);
    EventExecutor executor = next.executor();
    if (executor.inEventLoop()) {
        if (flush) {
            next.invokeWriteAndFlush(m, promise);
        } else {
        	//这里
            next.invokeWrite(m, promise);
        }
    } else {
        AbstractWriteTask task;
        if (flush) {
            task = WriteAndFlushTask.newInstance(next, m, promise);
        }  else {
            task = WriteTask.newInstance(next, m, promise);
        }
        safeExecute(executor, task, promise, m);
    }
}
```

可以看出先是找到下一个节点，然后调用他的write方法

#### 3.1.1. 怎么找到下一个节点的
```java
private AbstractChannelHandlerContext findContextOutbound() {
    AbstractChannelHandlerContext ctx = this;
    do {
        ctx = ctx.prev;
    } while (!ctx.outbound);
    return ctx;
}
```

无非就是从当前节点往前遍历到上一个outbound
tail的上一个outbound是什么呢？就是我们的OutboundHandlerB



## 4. 然后进入OutboundHandlerB

io.netty.channel.AbstractChannelHandlerContext#invokeWrite
```java
private void invokeWrite(Object msg, ChannelPromise promise) {
    if (invokeHandler()) {
        invokeWrite0(msg, promise);
    } else {
        write(msg, promise);
    }
}


 private void invokeWrite0(Object msg, ChannelPromise promise) {
    try {
    	//这里会进入我们的OutboundHandlerB
        ((ChannelOutboundHandler) handler()).write(this, msg, promise);
    } catch (Throwable t) {
        notifyOutboundHandlerException(t, promise);
    }
}


```


- OutboundHandlerB

```java
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception
{
    System.out.println(this.getClass().getSimpleName() + ":" + msg);
    ctx.write(msg, promise);
}

```
进入我们的OutboundHandlerB，打印之后，继续AbstractChannelHandlerContext#write

### 4.1. 通过AbstractChannelHandlerContext进行转发

## 5. 接着进入OutboundHandlerC

- OutboundHandlerC
```java
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception
{
    System.out.println(this.getClass().getSimpleName() + ":" + msg);
    ctx.write(msg, promise);
}
```

进入我们的OutboundHandlerC，打印之后，继续AbstractChannelHandlerContext#write

### 5.1. 通过AbstractChannelHandlerContext进行转发

## 6. 再进入OutboundHandlerA

- OutboundHandlerA
```java
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception
{
    System.out.println(this.getClass().getSimpleName() + ":" + msg);
    ctx.write(msg, promise);
}
```

进入我们的OutboundHandlerA，打印之后，继续AbstractChannelHandlerContext#write

### 6.1. 通过AbstractChannelHandlerContext进行转发

## 7. 最后进入HeadContext

- io.netty.channel.DefaultChannelPipeline.HeadContext#write

```java
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
    unsafe.write(msg, promise);
}

public final void write(Object msg, ChannelPromise promise) {
    assertEventLoop();

    ChannelOutboundBuffer outboundBuffer = this.outboundBuffer;
    if (outboundBuffer == null) {
        // If the outboundBuffer is null we know the channel was closed and so
        // need to fail the future right away. If it is not null the handling of the rest
        // will be done in flush0()
        // See https://github.com/netty/netty/issues/2362
        safeSetFailure(promise, WRITE_CLOSED_CHANNEL_EXCEPTION);
        // release message now to prevent resource-leak
        ReferenceCountUtil.release(msg);
        return;
    }

    int size;
    try {
        msg = filterOutboundMessage(msg);
        size = pipeline.estimatorHandle().size(msg);
        if (size < 0) {
            size = 0;
        }
    } catch (Throwable t) {
        safeSetFailure(promise, t);
        ReferenceCountUtil.release(msg);
        return;
    }

    outboundBuffer.addMessage(msg, size, promise);
}
```

进入我们的HeadContext，继续调用AbstractUnsafe，进行一些收尾的工作

