[toc]

 


## 1. Channel类体系

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230112411.png)


### 1.1. Channel
用于网络IO
```java
 * A nexus to a network socket or a component which is capable of I/O
 * operations such as read, write, connect, and bind.
 public interface Channel extends AttributeMap, ChannelOutboundInvoker, Comparable<Channel> {

```

### 1.2. AbstractChannel
Channel的骨架实现
```java
/**
 * A skeletal {@link Channel} implementation.
 */
private final Channel parent;
private final ChannelId id;
private final Unsafe unsafe;
private final DefaultChannelPipeline pipeline;

private final CloseFuture closeFuture = new CloseFuture(this);

private volatile SocketAddress localAddress;
private volatile SocketAddress remoteAddress;
private volatile EventLoop eventLoop;
```


### 1.3. AbstractNioChannel
使用Selector实现的Channel
```java
/**
 * Abstract base class for {@link Channel} implementations which use a Selector based approach.
 */
public abstract class AbstractNioChannel extends AbstractChannel {
```


### 1.4. AbstractNioByteChannel
操作字节流、对READ事件感兴趣的客户端channel
```java
/**
 * {@link AbstractNioChannel} base class for {@link Channel}s that operate on bytes.
 */
public abstract class AbstractNioByteChannel extends AbstractNioChannel {
	protected AbstractNioByteChannel(Channel parent, SelectableChannel ch) {
		super(parent, ch, SelectionKey.OP_READ);

	}
}

```

### 1.5. AbstractNioMessageChannel
对accept事件感兴趣的服务器channel
```java
/**
 * A {@link io.netty.channel.socket.ServerSocketChannel} implementation which uses
 * NIO selector based implementation to accept new connections.
 */
public class NioServerSocketChannel extends AbstractNioMessageChannel
                             implements io.netty.channel.socket.ServerSocketChannel {
    public NioServerSocketChannel(ServerSocketChannel channel) {
        super(null, channel, SelectionKey.OP_ACCEPT);
        config = new NioServerSocketChannelConfig(this, javaChannel().socket());
    }
}

```

## 2. Config类体系

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230112503.png)

