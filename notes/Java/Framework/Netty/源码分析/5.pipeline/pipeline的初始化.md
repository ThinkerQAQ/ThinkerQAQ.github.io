[toc]



## 1. pipeline在什么时候被创建

不管是客户端还是服务端channel，都会在AbstractChannel的构造函数创建，每个channel都有一个自己的pipeline
```java
protected AbstractChannel(Channel parent) {
    this.parent = parent;
    id = newId();
    unsafe = newUnsafe();
    pipeline = newChannelPipeline();//创建pipeline
}

```

- newPipeline
```java
protected DefaultChannelPipeline newChannelPipeline() {
    return new DefaultChannelPipeline(this);
}
```

## 2. pipeline是怎样的
- DefaultChannelPipeline
```java
protected DefaultChannelPipeline(Channel channel) {
    this.channel = ObjectUtil.checkNotNull(channel, "channel");
    succeededFuture = new SucceededChannelFuture(channel, null);
    voidPromise =  new VoidChannelPromise(channel, true);

	//头尾节点
    tail = new TailContext(this);
    head = new HeadContext(this);

	//头尾连接，双向链表
    head.next = tail;
    tail.prev = head;
}
```
pipeline是一个双向链表

### 2.1. pipeline节点数据结构ChannelHandlerContext

```java
//该接口的默认实现类是AbstractChannelHandlerContext
public interface ChannelHandlerContext extends AttributeMap, ChannelInboundInvoker, ChannelOutboundInvoker {
	//跟该节点绑定的channel
    Channel channel();

    //执行task的线程池
    EventExecutor executor();

    //该handler的名字
    String name();

    //执行业务逻辑的handler
    ChannelHandler handler();

    //ChannelInboundInvoker传播读事件的方法

    //ChannelOutboundInvoker传播写事件的方法
}

```

## 3. Tail和Head分析


### 3.1. TailContext是一个Inbound
```java
final class TailContext extends AbstractChannelHandlerContext implements ChannelInboundHandler {//实现了Inbound

    TailContext(DefaultChannelPipeline pipeline) {
    	//AbstractChannelHandlerContext(DefaultChannelPipeline pipeline, EventExecutor executor, String name,
        //                          boolean inbound, boolean outbound) 
        //TAIL是个inbound
        super(pipeline, null, TAIL_NAME, true, false);
		//标识该handlerContext已经创建
        setAddComplete();
    }

    @Override
	//说明context就是handler
    public ChannelHandler handler() {
        return this;
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        onUnhandledInboundException(cause);
        /*最终调用下面的，所以可以看出tail主要做一些收尾的工作，如果前面没有处理，会打印警告信息
        protected void onUnhandledInboundException(Throwable cause) {
		    try {
				    logger.warn(
				            "An exceptionCaught() event was fired, and it reached at the tail of the pipeline. " +
				                    "It usually means the last handler in the pipeline did not handle the exception.",
				            cause);
				} finally {
				    ReferenceCountUtil.release(cause);
				}
			}*/
    }

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        onUnhandledInboundMessage(msg);
        /*

		protected void onUnhandledInboundMessage(Object msg) {
		    try {
		        logger.debug(
		                "Discarded inbound message {} that reached at the tail of the pipeline. " +
		                        "Please check your pipeline configuration.", msg);
		    } finally {
		        ReferenceCountUtil.release(msg);
		    }
		}
        */
    }
}
```



### 3.2. HeadContext是一个Outbound
```java
final class HeadContext extends AbstractChannelHandlerContext
            implements ChannelOutboundHandler, ChannelInboundHandler {//既实现了inbound，又实现了outbound
	//有一个unsafe实例，用于处理读写数据的操作
    private final Unsafe unsafe;

    HeadContext(DefaultChannelPipeline pipeline) {
    	//AbstractChannelHandlerContext(DefaultChannelPipeline pipeline, EventExecutor executor, String name,
        //                          boolean inbound, boolean outbound) 
		//head只是个outbound
        super(pipeline, null, HEAD_NAME, false, true);
        unsafe = pipeline.channel().unsafe();
        setAddComplete();
    }

	//数据处理的操作转交给unsafe处理
    @Override
    public void bind(
            ChannelHandlerContext ctx, SocketAddress localAddress, ChannelPromise promise)
            throws Exception {
        unsafe.bind(localAddress, promise);
    }

    @Override
    public void connect(
            ChannelHandlerContext ctx,
            SocketAddress remoteAddress, SocketAddress localAddress,
            ChannelPromise promise) throws Exception {
        unsafe.connect(remoteAddress, localAddress, promise);
    }

	//进行事件传播
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        ctx.fireExceptionCaught(cause);
    }

    @Override
    public void channelRegistered(ChannelHandlerContext ctx) throws Exception {
        invokeHandlerAddedIfNeeded();
        ctx.fireChannelRegistered();
    }
}
```


