[toc]

 


## 1. 添加handler以备实验

我们添加三个InboundHandler进行试验
- InboundHandlerA
```java
package com.zsk.server.handler;

import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;

/**
 * @description:
 * @author: zsk
 * @create: 2019-12-10 20:41
 **/
public class InboundHandlerA extends ChannelInboundHandlerAdapter
{
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception
    {
    	//都只是简单的打印类名以及消息
        System.out.println(this.getClass().getSimpleName() + ":" + msg);
        ctx.fireChannelRead(msg);
    }

    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception
    {
        ctx.pipeline().fireChannelRead("Hello World");
    }
}

```

- InboundHandlerB、C都一样

```java
package com.zsk.server.handler;

import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;

/**
 * @description:
 * @author: zsk
 * @create: 2019-12-10 20:41
 **/
public class InboundHandlerA extends ChannelInboundHandlerAdapter
{
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception
    {
    	//都只是简单的打印类名以及消息
        System.out.println(this.getClass().getSimpleName() + ":" + msg);
        ctx.fireChannelRead(msg);
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
        //按顺序添加
        pipeline.addLast(new InboundHandlerA())
                .addLast(new InboundHandlerB())
                .addLast(new InboundHandlerC());
    }
});

```

## 2. 从pipeline开始调用

但我们使用ctx.pipeline().fireChannelRead("Hello World")的时候，首先把消息传递到pipeline
- DefaultChannelPipeline#fireChannelRead
```java
public final ChannelPipeline fireChannelRead(Object msg) {
    AbstractChannelHandlerContext.invokeChannelRead(head, msg);
    return this;
}
```

消息会通过AbstractChannelHandlerContext进行转发

## 3. 通过AbstractChannelHandlerContext进行转发

```java
static void invokeChannelRead(final AbstractChannelHandlerContext next, Object msg) {
    final Object m = next.pipeline.touch(ObjectUtil.checkNotNull(msg, "msg"), next);
    EventExecutor executor = next.executor();
    if (executor.inEventLoop()) {
        next.invokeChannelRead(m);
    } else {
        executor.execute(new Runnable() {
            @Override
            public void run() {
                next.invokeChannelRead(m);
            }
        });
    }
}
```

我们可以debug看看这个next是什么：DefaultChannelPipeline$HeadContext，说明了消息从pipeline过来后进入的第一个节点为Head
- AbstractChannelHandlerContext#invokeChannelRead
```java
private void invokeChannelRead(Object msg) {
    if (invokeHandler()) {
        try {
        	//io.netty.channel.DefaultChannelPipeline.HeadContext#channelRead
            ((ChannelInboundHandler) handler()).channelRead(this, msg);
        } catch (Throwable t) {
            notifyHandlerException(t);
        }
    } else {
        fireChannelRead(msg);
    }
}


```


## 4. 首先进入HeadContext


DefaultChannelPipeline.HeadContext#channelRead
```java
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
	//io.netty.channel.AbstractChannelHandlerContext#fireChannelRead
    ctx.fireChannelRead(msg);
}
```

HeadContext中不做什么事情，只是又重调用AbstractChannelHandlerContext#fireChannelRead
```java
public ChannelHandlerContext fireChannelRead(final Object msg) {
    invokeChannelRead(findContextInbound(), msg);
    return this;
}
```

这里就有点意思了，首先通过findContextInbound找到下一个节点，然后通过invokeChannelRead调用其channelRead方法

### 4.1. 怎么找下一个节点的
```java
private AbstractChannelHandlerContext findContextInbound() {
    AbstractChannelHandlerContext ctx = this;
    do {
        ctx = ctx.next;
    } while (!ctx.inbound);
    return ctx;
}
```

其实就是从当前节点沿着链表往后找inbound节点，而下一个节点就是我们的InboundHandlerA
invokeChannelRead的逻辑同 通过AbstractChannelHandlerContext进行转发，进入InboundHandlerA的channelRead

## 5. 进入InboundHandlerA

```java
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception
{
    System.out.println(this.getClass().getSimpleName() + ":" + msg);
    ctx.fireChannelRead(msg);
}
```

打印了消息后，这次通过AbstractChannelHandlerContext#fireChannelRead而不是pipeline，逻辑同上面的

```java
public ChannelHandlerContext fireChannelRead(final Object msg) {
    invokeChannelRead(findContextInbound(), msg);
    return this;
}
```

这里就有点意思了，首先通过findContextInbound找到下一个节点，然后通过invokeChannelRead调用其channelRead方法

### 5.1. 怎么找下一个节点的
```java
private AbstractChannelHandlerContext findContextInbound() {
    AbstractChannelHandlerContext ctx = this;
    do {
        ctx = ctx.next;
    } while (!ctx.inbound);
    return ctx;
}
```

其实就是从当前节点沿着链表往后找inbound节点，而下一个节点就是我们的InboundHandlerB

## 6. 进入InboundHandlerB

```java
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception
{
    System.out.println(this.getClass().getSimpleName() + ":" + msg);
    ctx.fireChannelRead(msg);
}

```

打印消息后同进入InboundHandlerA，这次进入InboundHandlerC

## 7. 进入InboundHandlerC

```java
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception
{
    System.out.println(this.getClass().getSimpleName() + ":" + msg);
    ctx.fireChannelRead(msg);
}
```

C打印完后，下一个节点就是tail了

## 8. 进入TailContext

```java
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
    onUnhandledInboundMessage(msg);
}

protected void onUnhandledInboundMessage(Object msg) {
    try {
        logger.debug(
                "Discarded inbound message {} that reached at the tail of the pipeline. " +
                        "Please check your pipeline configuration.", msg);
    } finally {
        ReferenceCountUtil.release(msg);
    }
}
```

如果开启了调试模式那么打印信息，并且最后释放资源，说明netty的收尾工作做的很好

