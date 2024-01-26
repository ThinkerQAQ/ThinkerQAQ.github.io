[toc]

 

## 1. 要分析的代码

```java
protected void run() {
    for (;;) {
        try {
            switch (selectStrategy.calculateStrategy(selectNowSupplier, hasTasks())) {
                case SelectStrategy.CONTINUE:
                    continue;
                case SelectStrategy.SELECT:
                	//轮询注册到这个NioEventLoop的selector的io事件
                    select(wakenUp.getAndSet(false));

                 

                    if (wakenUp.get()) {
                        selector.wakeup();
                    }
                    // fall through
                default:
            }

            cancelledKeys = 0;
            needsToSelectAgain = false;
            final int ioRatio = this.ioRatio;//默认情况下是50
        	//ioRatio均衡两者的时间
            if (ioRatio == 100) {
                try {
                	//处理IO事件
                    processSelectedKeys();
                } finally {
                	//处理外部线程扔到taskQueue里面的任务
                    // Ensure we always run tasks.
                    runAllTasks();
                }
            } else {
               //。。。
               //下面有
            }
        } catch (Throwable t) {
            handleLoopException(t);
        }
        // Always handle shutdown even if the loop processing threw an exception.
        try {
            if (isShuttingDown()) {
                closeAll();
                if (confirmShutdown()) {
                    return;
                }
            }
        } catch (Throwable t) {
            handleLoopException(t);
        }
    }
}
```


如上代码主要分为三块逻辑
- 死循环
    - 检测是否有IO事件 select
    - 处理IO事件 processSelectedKeys
    - 处理异步任务队列 runAllTasks

处理IO事件和处理外部线程的异步任务两者的时间由ioRatio平衡，默认情况下50，代表的意思是一半时间执行processSelectedKeys，另一半执行runAllTasks。
上面else的逻辑就是如此
```java
else {
	//处理io的启动时间
    final long ioStartTime = System.nanoTime();
    try {
        processSelectedKeys();
    } finally {
        // Ensure we always run tasks.
        //处理完io的时间-启动时间=io花了多少时间
        final long ioTime = System.nanoTime() - ioStartTime;
        //50的时候传入的参数就是ioTime*(100 -50)/50==ioTime
		//即runAllTasks的时间也是ioTime
        runAllTasks(ioTime * (100 - ioRatio) / ioRatio);
    }
}
```


## 2. 检测是否有IO事件 select
```java
private void select(boolean oldWakenUp) throws IOException {
    Selector selector = this.selector;
    try {
    	//解决空轮询的关键
        int selectCnt = 0;//执行了多少了空轮询循环
        long currentTimeNanos = System.nanoTime();//执行开始时间
        long selectDeadLineNanos = currentTimeNanos + delayNanos(currentTimeNanos);//正常执行执行应该结束的时间

        for (;;) {
        	//计算超时时长
            long timeoutMillis = (selectDeadLineNanos - currentTimeNanos + 500000L) / 1000000L;
        	//如果超时了
            if (timeoutMillis <= 0) {
				//且一次select都没有执行
                if (selectCnt == 0) {
                	//执行非阻塞的select
                    selector.selectNow();
                    selectCnt = 1;
                }
                break;
            }

			//如果没有超时

			//任务队列里有任务--即外部线程放入了一个任务到任务队列中
            if (hasTasks() && wakenUp.compareAndSet(false, true)) {
            	//执行非阻塞的select
                selector.selectNow();
                selectCnt = 1;
                break;
            }

			//任务队列中没有任务，执行阻塞的select操作，时间为timeout。！！！【如果发生了空轮询那么这里不会阻塞到timeout时间】
            int selectedKeys = selector.select(timeoutMillis);
            selectCnt ++;

			//如果轮询到了事件 || 当前select操作是否需要唤醒 || 执行select的时候被外部线程唤醒 || 队列中有任务 || 定时任务队列有任务
            if (selectedKeys != 0 || oldWakenUp || wakenUp.get() || hasTasks() || hasScheduledTasks()) {
                //则本次select操作终止
                break;
            }
            if (Thread.interrupted()) {
                // Thread was interrupted so reset selected keys and break so we not run into a busy loop.
                // As this is most likely a bug in the handler of the user or it's client library we will
                // also log it.
                //
                // See https://github.com/netty/netty/issues/2426
                if (logger.isDebugEnabled()) {
                    logger.debug("Selector.select() returned prematurely because " +
                            "Thread.currentThread().interrupt() was called. Use " +
                            "NioEventLoop.shutdownGracefully() to shutdown the NioEventLoop.");
                }
                selectCnt = 1;
                break;
            }


			//每次执行到这里说明进行了一次阻塞式的select操作

			//执行到这里的时间-开始轮询的时间 > 超时时间
			//说明上面的select(timeOut)确实是阻塞了timeout时间，那么没有发生空轮询
			//selectCnt重置为1
            long time = System.nanoTime();
            if (time - TimeUnit.MILLISECONDS.toNanos(timeoutMillis) >= currentTimeNanos) {
                // timeoutMillis elapsed without anything selected.
                selectCnt = 1;
            //这里说明发生了空轮询，如果轮询次数>512，那么重建selector
            } else if (SELECTOR_AUTO_REBUILD_THRESHOLD > 0 &&
                    selectCnt >= SELECTOR_AUTO_REBUILD_THRESHOLD) {

                logger.warn(
                        "Selector.select() returned prematurely {} times in a row; rebuilding Selector {}.",
                        selectCnt, selector);
				//将老的selector上的selectorKey注册到新的selector上
                rebuildSelector();
                selector = this.selector;

                // Select again to populate selectedKeys.
                selector.selectNow();
                selectCnt = 1;
                break;
            }

            currentTimeNanos = time;
        }

        if (selectCnt > MIN_PREMATURE_SELECTOR_RETURNS) {
            if (logger.isDebugEnabled()) {
                logger.debug("Selector.select() returned prematurely {} times in a row for Selector {}.",
                        selectCnt - 1, selector);
            }
        }
    } catch (CancelledKeyException e) {
        if (logger.isDebugEnabled()) {
            logger.debug(CancelledKeyException.class.getSimpleName() + " raised by a Selector {} - JDK bug?",
                    selector, e);
        }
        // Harmless exception - log anyway
    }
}

```
### 2.1. 重建selecor
```java
private void rebuildSelector0() {
    final Selector oldSelector = selector;
    final SelectorTuple newSelectorTuple;

    if (oldSelector == null) {
        return;
    }

    try {
    	//创建新的selector
        newSelectorTuple = openSelector();
    } catch (Exception e) {
        logger.warn("Failed to create a new Selector.", e);
        return;
    }

    // Register all channels to the new Selector.
    int nChannels = 0;
    //对于旧的selector上的所有key
    for (SelectionKey key: oldSelector.keys()) {
    	//拿出他的attachment
        Object a = key.attachment();
        try {
            if (!key.isValid() || key.channel().keyFor(newSelectorTuple.unwrappedSelector) != null) {
                continue;
            }
			//拿出他的感兴趣的事件
            int interestOps = key.interestOps();
            //把旧的key取消
            key.cancel();
            //用感兴趣的事件，attachment重新注册一个新的key
            SelectionKey newKey = key.channel().register(newSelectorTuple.unwrappedSelector, interestOps, a);
            if (a instanceof AbstractNioChannel) {
                // Update SelectionKey
                //关联到channel上	
                ((AbstractNioChannel) a).selectionKey = newKey;
            }
            nChannels ++;
        } catch (Exception e) {
            logger.warn("Failed to re-register a Channel to the new Selector.", e);
            if (a instanceof AbstractNioChannel) {
                AbstractNioChannel ch = (AbstractNioChannel) a;
                ch.unsafe().close(ch.unsafe().voidPromise());
            } else {
                @SuppressWarnings("unchecked")
                NioTask<SelectableChannel> task = (NioTask<SelectableChannel>) a;
                invokeChannelUnregistered(task, key, e);
            }
        }
    }

    selector = newSelectorTuple.selector;
    unwrappedSelector = newSelectorTuple.unwrappedSelector;

    try {
        // time to close the old selector as everything else is registered to the new one
        oldSelector.close();
    } catch (Throwable t) {
        if (logger.isWarnEnabled()) {
            logger.warn("Failed to close the old Selector.", t);
        }
    }

    logger.info("Migrated " + nChannels + " channel(s) to the new Selector.");
}
```


## 3. 处理IO事件 processSelectedKeys

### 3.1. selected keyset优化
其实就是用数组替换hashset中 add 方法的实现，从而做到add O（1）时间复杂度
- 回到创建NioEventLoop的构造方法，有一段openSelector操作
```java
private SelectorTuple openSelector() {
    final Selector unwrappedSelector;
    try {
    	//调用jdk创建selector
        unwrappedSelector = provider.openSelector();
    } catch (IOException e) {
        throw new ChannelException("failed to open a new selector", e);
    }
	//如果不优化，那么直接返回jdk的selector
    if (DISABLE_KEYSET_OPTIMIZATION) {
        return new SelectorTuple(unwrappedSelector);
    }
	
	//优化后的set数据结构--就是数组实现的
    final SelectedSelectionKeySet selectedKeySet = new SelectedSelectionKeySet();

    Object maybeSelectorImplClass = AccessController.doPrivileged(new PrivilegedAction<Object>() {
        @Override
        public Object run() {
            try {
            	//通过反射拿到sun.nio.ch.SelectorImpl这个class对象
                return Class.forName(
                        "sun.nio.ch.SelectorImpl",
                        false,
                        PlatformDependent.getSystemClassLoader());
            } catch (Throwable cause) {
                return cause;
            }
        }
    });

	//拿到sun.nio.ch.SelectorImpl这个class对象后判断一下是否真的拿到了
    if (!(maybeSelectorImplClass instanceof Class) ||
            // ensure the current selector implementation is what we can instrument.
        	//以及selector是否是这个类sun.nio.ch.SelectorImpl的一个实现
            !((Class<?>) maybeSelectorImplClass).isAssignableFrom(unwrappedSelector.getClass())) {
        if (maybeSelectorImplClass instanceof Throwable) {
            Throwable t = (Throwable) maybeSelectorImplClass;
            logger.trace("failed to instrument a special java.util.Set into: {}", unwrappedSelector, t);
        }
        //不是的话返回原生的selector
        return new SelectorTuple(unwrappedSelector);
    }

	
    final Class<?> selectorImplClass = (Class<?>) maybeSelectorImplClass;

    Object maybeException = AccessController.doPrivileged(new PrivilegedAction<Object>() {
        @Override
        public Object run() {
            try {
            	//拿到最重要的两个属性selectedKeys、publicSelectedKeys。默认情况下是hashset
                Field selectedKeysField = selectorImplClass.getDeclaredField("selectedKeys");
                Field publicSelectedKeysField = selectorImplClass.getDeclaredField("publicSelectedKeys");

                Throwable cause = ReflectionUtil.trySetAccessible(selectedKeysField, true);
                if (cause != null) {
                    return cause;
                }
                cause = ReflectionUtil.trySetAccessible(publicSelectedKeysField, true);
                if (cause != null) {
                    return cause;
                }
				//反射的标准流程，设置为我们的数组实现
                selectedKeysField.set(unwrappedSelector, selectedKeySet);
                publicSelectedKeysField.set(unwrappedSelector, selectedKeySet);
                return null;
            } catch (NoSuchFieldException e) {
                return e;
            } catch (IllegalAccessException e) {
                return e;
            }
        }
    });

    if (maybeException instanceof Exception) {
        selectedKeys = null;
        Exception e = (Exception) maybeException;
        logger.trace("failed to instrument a special java.util.Set into: {}", unwrappedSelector, e);
        return new SelectorTuple(unwrappedSelector);
    }
    selectedKeys = selectedKeySet;
    logger.trace("instrumented a special java.util.Set into: {}", unwrappedSelector);
    return new SelectorTuple(unwrappedSelector,
                             new SelectedSelectionKeySetSelector(unwrappedSelector, selectedKeySet));
}
```

- SelectedSelectionKeySet

```java
final class SelectedSelectionKeySet extends AbstractSet<SelectionKey> {

	//就是用数组和size实现的
    SelectionKey[] keys;
    int size;

    SelectedSelectionKeySet() {
        keys = new SelectionKey[1024];//默认长度1024
    }

    @Override
    public boolean add(SelectionKey o) {
        if (o == null) {
            return false;
        }
		//直接赋值（O（1））
        keys[size++] = o;
        if (size == keys.length) {
            increaseCapacity();//扩容为两倍。SelectionKey[] newKeys = new SelectionKey[keys.length << 1];
        }

        return true;
    }

    //........
    //其他操作都是没实现的
}

```

### 3.2. processSelectedKeysOptimized

回到NioEventLoop的run方法的processSelectedKeysOptimized
```java
private void processSelectedKeysOptimized() {
	//遍历我们的数组实现拿到所有key
	for (int i = 0; i < selectedKeys.size; ++i) {
		final SelectionKey k = selectedKeys.keys[i];
		// null out entry in the array to allow to have it GC'ed once the Channel close
		 See https:github.com/netty/netty/issues/2363
		selectedKeys.keys[i] = null;

		//拿到key对应的attchment
		final Object a = k.attachment();
		//是AbstractNioChannel，进行处理
		if (a instanceof AbstractNioChannel) {
			processSelectedKey(k, (AbstractNioChannel) a);
		} else {
			@SuppressWarnings("unchecked")
			NioTask<SelectableChannel> task = (NioTask<SelectableChannel>) a;
			processSelectedKey(k, task);
		}

		if (needsToSelectAgain) {
			// null out entries in the array to allow to have it GC'ed once the Channel close
			 See https:github.com/netty/netty/issues/2363
			selectedKeys.reset(i + 1);

			selectAgain();
			i = -1;
		}
	}
}



private void processSelectedKey(SelectionKey k, AbstractNioChannel ch) {
    final AbstractNioChannel.NioUnsafe unsafe = ch.unsafe();
	//key不合法的处理
    if (!k.isValid()) {
        final EventLoop eventLoop;
        try {
            eventLoop = ch.eventLoop();
        } catch (Throwable ignored) {
            // If the channel implementation throws an exception because there is no event loop, we ignore this
            // because we are only trying to determine if ch is registered to this event loop and thus has authority
            // to close ch.
            return;
        }
        // Only close ch if ch is still registered to this EventLoop. ch could have deregistered from the event loop
        // and thus the SelectionKey could be cancelled as part of the deregistration process, but the channel is
        // still healthy and should not be closed.
        // See https://github.com/netty/netty/issues/5125
        if (eventLoop != this || eventLoop == null) {
            return;
        }
        // close the channel if the key is not valid anymore
        unsafe.close(unsafe.voidPromise());
        return;
    }

    try {
    	//拿到所有的事件
        int readyOps = k.readyOps();
        // We first need to call finishConnect() before try to trigger a read(...) or write(...) as otherwise
        // the NIO JDK channel implementation may throw a NotYetConnectedException.
        //对OP_CONNECT等事件的处理
        if ((readyOps & SelectionKey.OP_CONNECT) != 0) {
            // remove OP_CONNECT as otherwise Selector.select(..) will always return without blocking
            // See https://github.com/netty/netty/issues/924
            int ops = k.interestOps();
            ops &= ~SelectionKey.OP_CONNECT;
            k.interestOps(ops);

            unsafe.finishConnect();
        }

        // Process OP_WRITE first as we may be able to write some queued buffers and so free memory.
        if ((readyOps & SelectionKey.OP_WRITE) != 0) {
            // Call forceFlush which will also take care of clear the OP_WRITE once there is nothing left to write
            ch.unsafe().forceFlush();
        }

        // Also check for readOps of 0 to workaround possible JDK bug which may otherwise lead
        // to a spin loop
    	//如果是bossGroup那么轮询出来的是一个OP_READ事件，如果是workerGroup那么轮询出来的是一个OP_ACCEPT事件
        if ((readyOps & (SelectionKey.OP_READ | SelectionKey.OP_ACCEPT)) != 0 || readyOps == 0) {
            unsafe.read();
        }
    } catch (CancelledKeyException ignored) {
        unsafe.close(unsafe.voidPromise());
    }
}

```

## 4. 处理异步任务队列 runAllTasks

### 4.1. task的分类和添加
task有两种，一种是定时调度任务，另一种是普通任务
#### 4.1.1. 普通任务
```java
protected SingleThreadEventExecutor(EventExecutorGroup parent, Executor executor,
                                    boolean addTaskWakesUp, int maxPendingTasks,
                                    RejectedExecutionHandler rejectedHandler) {
    super(parent);
    this.addTaskWakesUp = addTaskWakesUp;
    this.maxPendingTasks = Math.max(16, maxPendingTasks);
    this.executor = ObjectUtil.checkNotNull(executor, "executor");
    taskQueue = newTaskQueue(this.maxPendingTasks);//这里
    rejectedExecutionHandler = ObjectUtil.checkNotNull(rejectedHandler, "rejectedHandler");
}
```

##### 4.1.1.1. 普通任务是何时添加的
外部线程调用NioEventLoop的execute方法的时候
```java
public void execute(Runnable task) {
    if (task == null) {
        throw new NullPointerException("task");
    }

    boolean inEventLoop = inEventLoop();
    addTask(task);//直接添加进任务队列（说明是线程安全的 PlatformDependent.<Runnable>newMpscQueue）：taskQueue.offer(task);
    if (!inEventLoop) {//不在nioEventLoop中的线程
        startThread();//开启一个新的线程进行处理
        if (isShutdown() && removeTask(task)) {
            reject();
        }
    }

    if (!addTaskWakesUp && wakesUpForTask(task)) {
        wakeup(inEventLoop);
    }
}

```
#### 4.1.2. 定时任务
AbstractScheduledEventExecutor#schedule
```java
public <V> ScheduledFuture<V> schedule(Callable<V> callable, long delay, TimeUnit unit) {
    ObjectUtil.checkNotNull(callable, "callable");
    ObjectUtil.checkNotNull(unit, "unit");
    if (delay < 0) {
        delay = 0;
    }
    validateScheduled(delay, unit);

	//封装成ScheduledFutureTask
    return schedule(new ScheduledFutureTask<V>(
            this, callable, ScheduledFutureTask.deadlineNanos(unit.toNanos(delay))));
}

<V> ScheduledFuture<V> schedule(final ScheduledFutureTask<V> task) {
	//是在NioEventLoop中的线程，那么直接添加
    if (inEventLoop()) {
        scheduledTaskQueue().add(task);
    } else {
    	//否则对镜线程中添加--为啥？因为这个队列不是线程安全的DefaultPriorityQueue
        execute(new Runnable() {
            @Override
            public void run() {
                scheduledTaskQueue().add(task);
            }
        });
    }

    return task;
}

```

### 4.2. 任务的聚合
回到runAllTasks的第一个操作fetchFromScheduledTaskQueue
```java
private boolean fetchFromScheduledTaskQueue() {
    long nanoTime = AbstractScheduledEventExecutor.nanoTime();
    //从定时任务队列中取出任务：任务是按照截止时间由小到大排序的：ScheduledFutureTask.compareTo方法
    Runnable scheduledTask  = pollScheduledTask(nanoTime);
    while (scheduledTask != null) {
    	//塞进普通任务队列里
        if (!taskQueue.offer(scheduledTask)) {
            // No space left in the task queue add it back to the scheduledTaskQueue so we pick it up again.
			//失败了重新添加回定时队列
            scheduledTaskQueue().add((ScheduledFutureTask<?>) scheduledTask);
            return false;
        }
    	//继续
        scheduledTask  = pollScheduledTask(nanoTime);
    }
    return true;
}
```




### 4.3. 任务的执行
```java
protected boolean runAllTasks(long timeoutNanos) {
	//见上面的分析
    fetchFromScheduledTaskQueue();
	//从普通任务队列中拿出一个
    Runnable task = pollTask();
    if (task == null) {
        afterRunningAllTasks();
        return false;
    }

    final long deadline = ScheduledFutureTask.nanoTime() + timeoutNanos;
    long runTasks = 0;
    long lastExecutionTime;
    //不停的执行任务
    for (;;) {
		//task.run
        safeExecute(task);

        runTasks ++;

        // Check timeout every 64 tasks because nanoTime() is relatively expensive.
        // XXX: Hard-coded value - will make it configurable if it is really a problem.
    	//累计到64个任务的时候，会计算当前时间如果超过截止时间就不执行了
        if ((runTasks & 0x3F) == 0) {
            lastExecutionTime = ScheduledFutureTask.nanoTime();
            if (lastExecutionTime >= deadline) {
                break;
            }
        }

		//没有超过那么再拿一个任务
        task = pollTask();
        if (task == null) {
            lastExecutionTime = ScheduledFutureTask.nanoTime();
            break;
        }
    }

    afterRunningAllTasks();
    this.lastExecutionTime = lastExecutionTime;
    return true;
}

```

## 5. 参考


### 5.1. JDK空轮询bug
- [JDK Epoll空轮询bug \- 简书](https://www.jianshu.com/p/3ec120ca46b2)

