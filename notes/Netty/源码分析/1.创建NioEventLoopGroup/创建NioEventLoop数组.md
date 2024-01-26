[toc]

 
## 1. 要分析的代码
```java
//NioEventLoopGroup池子中的NioEventLoop保存在数组中
children = new EventExecutor[nThreads];

children[i] = newChild(executor, args);
```
## 2. 传入NioEventLoop构造的参数
我们接着看`newChild(executor, args)`，跳转到
- NioEventLoopGroup#newChild
```java
protected EventLoop newChild(Executor executor, Object... args) throws Exception {
    return new NioEventLoop(this, executor, (SelectorProvider) args[0],
        ((SelectStrategyFactory) args[1]).newSelectStrategy(), (RejectedExecutionHandler) args[2]);
}
```

调用构造方法传入的参数
- this是NioEventLoopGroup自己
- executor是刚刚创建的ThreadPerTaskExecutor，说明每个NioEventLoop共享是同一个线程池
- SelectorProvider用于创建jdk nio的selector
- select策略为DefaultSelectStrategy.INSTANCE
- 拒绝策略

## 3. NioEventLoop是个单线程的线程池
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230110700.png)
由图看出NioEventLoop也是个线程池，可以把任务封装成Runnable丢给他执行。
奇怪的是他继承的SIngleThreadEventLoop，从名字可以看出是个单线程的线程池？

## 4. NioEventLoop构造方法

### 4.1. 创建selector
```java
NioEventLoop(NioEventLoopGroup parent, Executor executor, SelectorProvider selectorProvider,
             SelectStrategy strategy, RejectedExecutionHandler rejectedExecutionHandler) {
	//父类SingleThreadEventLoop的构造
    super(parent, executor, false, DEFAULT_MAX_PENDING_TASKS, rejectedExecutionHandler);
    if (selectorProvider == null) {
        throw new NullPointerException("selectorProvider");
    }
    if (strategy == null) {
        throw new NullPointerException("selectStrategy");
    }
    provider = selectorProvider;
    //创建Selector
    //unwrappedSelector = provider.openSelector();
    final SelectorTuple selectorTuple = openSelector();
    selector = selectorTuple.selector;
    unwrappedSelector = selectorTuple.unwrappedSelector;
    //保存选择策略
    selectStrategy = strategy;
}
```
这里创建了selector，说明每个NioEventLoop都有一个Selector与之对应

继续看父类SingleThreadEventLoop的构造
- SingleThreadEventLoop
```java
protected SingleThreadEventLoop(EventLoopGroup parent, Executor executor,
								boolean addTaskWakesUp, int maxPendingTasks,
								RejectedExecutionHandler rejectedExecutionHandler) {

	//父类SingleThreadEventExecutor
	super(parent, executor, addTaskWakesUp, maxPendingTasks, rejectedExecutionHandler);
	//new LinkedBlockingQueue<Runnable>(maxPendingTasks);
	tailTasks = newTaskQueue(maxPendingTasks);
}
```

继续看父类SingleThreadEventExecutor

### 4.2. 创建保存任务的队列
- SingleThreadEventExecutor
```java
protected SingleThreadEventExecutor(EventExecutorGroup parent, Executor executor,
                                    boolean addTaskWakesUp, int maxPendingTasks,
                                    RejectedExecutionHandler rejectedHandler) {
	//AbstractScheduledEventExecutor->AbstractEventExecutor
    super(parent);
    this.addTaskWakesUp = addTaskWakesUp;
    this.maxPendingTasks = Math.max(16, maxPendingTasks);
    this.executor = ObjectUtil.checkNotNull(executor, "executor");
	//保存任务的队列
	//new LinkedBlockingQueue<Runnable>(maxPendingTasks);
    taskQueue = newTaskQueue(this.maxPendingTasks);
    rejectedExecutionHandler = ObjectUtil.checkNotNull(rejectedHandler, "rejectedHandler");
}
```

taskQueue用于外部线程执行netty的一些任务的时候，如果不是在NioEventLoop执行，就会塞到这个任务队列里，然后由NioEventLoop对应的线程取出来执行

