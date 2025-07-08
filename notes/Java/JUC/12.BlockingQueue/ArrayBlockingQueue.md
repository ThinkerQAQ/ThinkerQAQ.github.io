[toc]



## 1. 是什么

使用Object数组实现的有界的阻塞队列
读读、读写、写写相互阻塞

## 2. 如何使用

```java
public class ArrayBlockingQueueTest
{
    public static void main(String[] args) throws InterruptedException
    {
        ArrayBlockingQueue<String> queue = new ArrayBlockingQueue<>(1);
        CountDownLatch latch = new CountDownLatch(2);

        new Thread(()->{
            for (int i = 0;;i++)
            {
                try
                {
                 	String data = "data" + i;
                    queue.put(data);
                    System.out.println("Producer放入消息：" + data);
                    TimeUnit.SECONDS.sleep(1);
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
                finally
                {
                    latch.countDown();
                }
            }
        }).start();

        new Thread(()->{
            for (;;)
            {
                try
                {
                    System.out.println("Consumer获取消息：" + queue.take());
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
                finally
                {
                    latch.countDown();
                }
            }
        }).start();

        latch.await();

    }
}
```


### 2.1. 方法选择

| 方法\处理方式 |  抛出异常  | 返回特殊值 | 一直阻塞 |      超时退出       |
| ------------ | --------- | --------- | ------- | ------------------ |
| 插入方法      | add(e)    | offer(e)  | put(e)  | offer(e,time,unit) |
| 移除方法      | remove()  | poll()    | take()  | poll(time,unit)    |
| 检查方法      | element() | peek()    | 不可用   | 不可用              |

## 3. 原理分析


### 3.1. uml

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229225548.png)

### 3.2. 构造方法
#### 3.2.1. 底层使用数组+Lock+Condtion实现
```java
public class ArrayBlockingQueue<E> extends AbstractQueue<E>
    implements BlockingQueue<E>, java.io.Serializable {
	//底层是数组实现的
	final Object[] items;

	//take, poll, peek or remove等读方法，读取下一个元素的位置
	int takeIndex;
	//put, offer, or add等方法，写入下一个元素的位置
	int putIndex;

	//数组中实际元素的数量
	//当count==item.length()的时候说明数组已满
	int count;

	//一个锁说明读写互斥
	final ReentrantLock lock;
    //两个条件量
    private final Condition notEmpty;//用来唤醒读线程
	private final Condition notFull;//用来唤醒写线程

	public ArrayBlockingQueue(int capacity, boolean fair) {
		if (capacity <= 0)
			throw new IllegalArgumentException();
	
		this.items = new Object[capacity];
		lock = new ReentrantLock(fair);
		notEmpty = lock.newCondition();
		notFull =  lock.newCondition();
	}
}

```


### 3.3. put【阻塞】

```java
public void put(E e) throws InterruptedException {
    checkNotNull(e);
    //加锁
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
    	//如果数组已经满了，那么等待。读者取出元素后唤醒
        while (count == items.length)
            notFull.await();
        //没满，加入数组
        enqueue(e);
    } finally {
        lock.unlock();
    }
}
```

- 4行：加锁。一旦该写线程加锁其他读写线程都不能同时进来
- 8-9行：如果数组已经满了，那么阻塞等待
- 11行：没满则入队并唤醒读者

下面具体分析：


#### 3.3.1. 加锁
```java
//加锁
final ReentrantLock lock = this.lock;
lock.lockInterruptibly();
try {
    //...
} finally {
    lock.unlock();
}
```

#### 3.3.2. 如果数组已经满了，那么等待
```java
//如果数组已经满了，那么等待。直到读者取出元素后唤醒
while (count == items.length)
    notFull.await();
```

#### 3.3.3. 没满则入队并唤醒读者

```java
enqueue(e);
```
- enqueue

```java
private void enqueue(E x) {
    //把元素加入到队尾
    final Object[] items = this.items;
    items[putIndex] = x;
    //已插入到末尾，重置插入索引为0
    //这个数组是可以循环使用的，不需要扩容。
    if (++putIndex == items.length)
        putIndex = 0;
    count++;
    //插入后唤醒读者
    notEmpty.signal();
}
```


### 3.4. take【阻塞】

```java
public E take() throws InterruptedException {
	//加锁
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
    	//如果数组为空，那么等待。写者加入元素后唤醒
        while (count == 0)
            notEmpty.await();
    	//出队
        return dequeue();
    } finally {
    	//释放锁
        lock.unlock();
    }
}
```

- 3行：加锁。一旦该读线程加锁其他读写线程都不能同时进来
- 6-8行：如果数组为空，那么等待
- 10行：不为空则出队并唤醒写者

下面具体分析：

#### 3.4.1. 加锁
```java
//加锁
final ReentrantLock lock = this.lock;
lock.lockInterruptibly();
 try {
	//...
} finally {
	//释放锁
    lock.unlock();
}

```
#### 3.4.2. 如果数组为空，那么等待
```java
//如果数组为空，那么等待。写者加入元素后唤醒
while (count == 0)
    notEmpty.await();
```
#### 3.4.3. 不为空则出队并唤醒写者
- dequeue
```java
private E dequeue() {
    final Object[] items = this.items;
    @SuppressWarnings("unchecked")
    //获取最后一个元素并置为null
    E x = (E) items[takeIndex];
    items[takeIndex] = null;
    //已取到末尾，重置取值索引为0
     //这个数组是可以循环使用的，不需要扩容。
    if (++takeIndex == items.length)
        takeIndex = 0;
    count--;
    if (itrs != null)
        itrs.elementDequeued();
    //出队后唤醒写者
    notFull.signal();
    return x;
}
```


### 3.5. offer【返回特殊值】

```java
public boolean offer(E e) {
    checkNotNull(e);
    //加锁
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
    	//已满，直接返回false
        if (count == items.length)
            return false;
        else {
        	//未满，加入队列同时唤醒读者
            enqueue(e);
            return true;
        }
    } finally {
    	//解锁
        lock.unlock();
    }
}

```


### 3.6. poll【返回特殊值】

```java
public E poll() {
    final ReentrantLock lock = this.lock;
	//加锁
    lock.lock();
    try {
    	//长度为0直接返回null，否则出队并唤醒写者
        return (count == 0) ? null : dequeue();
    } finally {
        lock.unlock();
    }
}

```

### 3.7. add【抛出异常】

```java
public boolean add(E e) {
	//简单调用AbstractQueue的add方法
    return super.add(e);
}

//AbstractQueue的add方法
public boolean add(E e) {
	//调用ArrayBlockingQueue的方offer法
    if (offer(e))
        return true;
    else
        throw new IllegalStateException("Queue full");
}


```

### 3.8. remove【抛出异常】

```java
public E remove() {
	//简单调用poll方法
    E x = poll();
    if (x != null)
        return x;
    else
    	//没有元素，抛出异常
        throw new NoSuchElementException();
}
```


### 3.9. element【抛出异常】

```java
public E element() {
	//调用peek方法
    E x = peek();
    if (x != null)
        return x;
    else
    	//为空直接抛出异常
        throw new NoSuchElementException();
}
```


### 3.10. peek【返回特殊值】

```java
public E peek() {
	//加锁
	final ReentrantLock lock = this.lock;
	lock.lock();
	try {
		return itemAt(takeIndex); // null when queue is empty
	} finally {
		//解锁
		lock.unlock();
	}
}
	
	
@SuppressWarnings("unchecked")
final E itemAt(int i) {
	//直接返回数组中的第i个元素
    return (E) items[i];
}

```

## 4. 总结

底层使用数组实现，是个有界队列。
并且用了一个锁和两个condition。一个锁说明读写互斥，两个conditon说明读写相互唤醒

## 5. 参考
- [解读 Java 并发队列 BlockingQueue \- 掘金](https://juejin.im/post/5bcece9be51d457a765bce28)