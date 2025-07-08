[toc]


## 1. 要分析的代码
```java
executor = new ThreadPerTaskExecutor(newDefaultThreadFactory());
```

## 2. 创建构造线程的工厂
- newDefaultThreadFactory()

```java
protected ThreadFactory newDefaultThreadFactory() {
	//创建的是DefaultThreadFactory
    return new DefaultThreadFactory(getClass());
}
```

### 2.1. 设置线程池以及线程名
- DefaultThreadFactory

```java
public DefaultThreadFactory(Class<?> poolType, boolean daemon, int priority) {
    //toPoolName设置线程池的名字为类名首字母小写:nioEventLoopGroup
    //沿着构造方法的调用往下追
    this(toPoolName(poolType), daemon, priority);
}

public DefaultThreadFactory(String poolName, boolean daemon, int priority) {
    this(poolName, daemon, priority, System.getSecurityManager() == null ?
            Thread.currentThread().getThreadGroup() : System.getSecurityManager().getThreadGroup());
}

public DefaultThreadFactory(String poolName, boolean daemon, int priority, ThreadGroup threadGroup) {
    if (poolName == null) {
        throw new NullPointerException("poolName");
    }
    if (priority < Thread.MIN_PRIORITY || priority > Thread.MAX_PRIORITY) {
        throw new IllegalArgumentException(
                "priority: " + priority + " (expected: Thread.MIN_PRIORITY <= priority <= Thread.MAX_PRIORITY)");
    }

    prefix = poolName + '-' + poolId.incrementAndGet() + '-';//每个线程的名字
    this.daemon = daemon;
    this.priority = priority;
    this.threadGroup = threadGroup;
}
```

- 设置了线程池的名字：nioEventLoopGroup
- 每个线程的名字则是：nioEventLoopGroup-1-XX
    - 1表示哪个线程组，XX表示第几个线程

## 3. 创建executor
- new ThreadPerTaskExecutor(newDefaultThreadFactory())
```java
public final class ThreadPerTaskExecutor implements Executor {
    private final ThreadFactory threadFactory;

    public ThreadPerTaskExecutor(ThreadFactory threadFactory) {
        if (threadFactory == null) {
            throw new NullPointerException("threadFactory");
        }
        this.threadFactory = threadFactory;
    }

    @Override
    public void execute(Runnable command) {
    	//执行Runnable的时候是通过DefaultThreadFactory.newThread创建线程的
        threadFactory.newThread(command).start();
    }
}
```

由上面的`execute`方法可以看出每来一个任务，ThreadPerTaskExecutor这个线程池就会创建一个新的线程执行

### 3.1. 创建的线程是怎样的
- DefaultThreadFactory.newThread

```java
public Thread newThread(Runnable r) {
    Thread t = newThread(FastThreadLocalRunnable.wrap(r), prefix + nextId.incrementAndGet());
    //...
    return t;
}


protected Thread newThread(Runnable r, String name) {
    //这个FastThreadLocalThread extends Thread，是Netty自定义的Thread
    return new FastThreadLocalThread(threadGroup, r, name);
}
```

创建的线程是FastThreadLocalThread，继承了JDK的Thread，名字为线程池名字+数字

