[toc]



## 1. 是什么
使用单向链表实现的有界的阻塞队列
读读、写写相互阻塞，读写不相互阻塞
吞吐量比ArrayBlockingQueue高

## 2. 如何使用

```java
public class LinkedBlockingQueueTest
{
    public static void main(String[] args) throws InterruptedException
    {
        LinkedBlockingQueue<String> queue = new LinkedBlockingQueue<>(1);
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


## 3. 源码分析


### 3.1. 构造方法
#### 3.1.1. 底层使用单向链表+Lock+Condition实现
```java
public class LinkedBlockingQueue<E> extends AbstractQueue<E>
        implements BlockingQueue<E>, java.io.Serializable {

  	//最大长度
    private final int capacity;

    //实际长度
    private final AtomicInteger count = new AtomicInteger();

    //头节点
    transient Node<E> head;

    //尾节点
    private transient Node<E> last;

    //出队时用的锁。锁住队头
    private final ReentrantLock takeLock = new ReentrantLock();

    //如果读操作的时候队列是空的，那么等待 notEmpty 条件
    private final Condition notEmpty = takeLock.newCondition();

    //入队时用的锁。锁住队尾
    private final ReentrantLock putLock = new ReentrantLock();

    // 如果写操作的时候队列是满的，那么等待 notFull 条件
    private final Condition notFull = putLock.newCondition();

	public LinkedBlockingQueue() {
		//相当于无界队列
		this(Integer.MAX_VALUE);
	}

	public LinkedBlockingQueue(int capacity) {
		if (capacity <= 0) throw new IllegalArgumentException();
		this.capacity = capacity;//有界队列
		last = head = new Node<E>(null);//头节点是个占位符
	}
}
```


#### 3.1.2. Node
```java
static class Node<E> {
    E item;

    //单向队列
    Node<E> next;

    Node(E x) { item = x; }
}
```

结构如下图：
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200116110328.png)

### 3.2. put【阻塞】
```java
public void put(E e) throws InterruptedException {
        if (e == null) throw new NullPointerException();
    int c = -1;
    Node<E> node = new Node<E>(e);
    final ReentrantLock putLock = this.putLock;
    final AtomicInteger count = this.count;
    //加写锁
    putLock.lockInterruptibly();
    try {
        //链表实际容量到达链表最大容量，阻塞等待读者取出
        while (count.get() == capacity) {
            notFull.await();
        }
    	//加入尾部
        enqueue(node);
        c = count.getAndIncrement();//+1，不过返回的是c的原值
        if (c + 1 < capacity)
            notFull.signal();//唤醒其他写者？
    } finally {
        putLock.unlock();
    }
    //c == 0 说明原来queue是空的, 那么可能有其他读线程阻塞住了。
    if (c == 0)
    	//所以这里 唤醒正在 poll/take 等待中的线程
        signalNotEmpty();
}
```
- 8行：加写锁。一旦加了写锁其他写者无法同时进来写入数据，但是读者可以同时进来读
- 11-13行：链表实际容量到达链表最大容量，那么写者阻塞等待读者取出
- 15行：链表没有满的话，那么把该元素添加至尾部
- 16行：更新队列中元素的数量，+1，返回原值
- 17-18行：添加了元素后发现队列还是没有满，那么唤醒其他写者继续添加
- 23-25行：由这句`c = count.getAndIncrement();`可看出+1后返回的是c的原值，如果为0说明之前队列可能为空，那么加读锁、唤醒读者读取元素、解读锁

下面具体分析：

#### 3.2.1. 加写锁
```java
//加写锁
putLock.lockInterruptibly();
try {
//...
} finally {
    putLock.unlock();
}
```
#### 3.2.2. 如果队列已满那么等待
```java
//链表实际容量到达链表最大容量，阻塞等待读者取出
while (count.get() == capacity) {
    notFull.await();
}
```
#### 3.2.3. 未满则入队
- enqueue
```java
private void enqueue(Node<E> node) {
    //把节点加入到链表尾部，并且更新last指针
    last = last.next = node;
}
```
#### 3.2.4. 入队完发现队列没满，那么继续唤醒写者入队
```java
if (c + 1 < capacity)
    notFull.signal();//唤醒其他写者
```
#### 3.2.5. 入队完解锁后发现之前队列是空的，那么唤醒读者
```java
//c == 0 说明原来queue是空的, 那么可能有其他读线程阻塞住了。
if (c == 0)
	//所以这里 唤醒正在 poll/take 等待中的线程
    signalNotEmpty();
```
 - signalNotEmpty

```java
 private void signalNotEmpty() {
 	//加读锁
    final ReentrantLock takeLock = this.takeLock;
    takeLock.lock();
    try {
    	//唤醒读者
        notEmpty.signal();
    } finally {
        takeLock.unlock();
    }
}
```


### 3.3. take【阻塞】
```java
public E take() throws InterruptedException {
    E x;
    int c = -1;
    final AtomicInteger count = this.count;
    final ReentrantLock takeLock = this.takeLock;
	//加了读锁
    takeLock.lockInterruptibly();
    try {
    	//长度为0，阻塞等待写着加入
        while (count.get() == 0) {
            notEmpty.await();
        }
    	//删除第一个节点
        x = dequeue();
        c = count.getAndDecrement();
        if (c > 1)
            notEmpty.signal();//唤醒其他读者？
    } finally {
        takeLock.unlock();
    }
    //c == capacity 说明原来queue是满的, 那么可能有其他写线程阻塞住了。
    if (c == capacity)
    	//所以这里 唤醒正在 put 等待中的线程
        signalNotFull();
    return x;
}
```
- 7行：加读锁。一旦加了读锁其他读者无法同时进来读取数据，但是写者可以同时进来写数据
- 10-12行：链表实际容量为0，那么读者阻塞等待写者写入
- 14行：链表不为空的话，那么删除链表头部的元素
- 15行：更新队列中元素的数量，-1，返回原值
- 16-17行：取出了元素后发现队列还是不为空，那么唤醒其他读者继续读取
- 22-24行：由这句`c = count.getAndDecrement();`可看出-1后返回的是c的原值，当他为capacity的时候说明之前队列可能是满的，那么加写锁、唤醒写者写入元素、解写锁

下面具体分析：

#### 3.3.1. 加读锁
```java
//加了读锁
takeLock.lockInterruptibly();
try {
    //....
} finally {
    takeLock.unlock();
}
```
#### 3.3.2. 队列为空那么等待
```java
//长度为0，阻塞等待写着加入
while (count.get() == 0) {
    notEmpty.await();
}
```
#### 3.3.3. 未空则出队
- dequeue
```java
private E dequeue() {
    Node<E> h = head;//头节点是个占位符
    Node<E> first = h.next;//真正的第一个节点
    h.next = h; // help GC 头节点next指向头节点自己？
    head = first;//更新头节点指向第一个节点（即从队头出队）
    E x = first.item;
    first.item = null;
    return x;
}
```
#### 3.3.4. 出了队发现队列没空，那么继续唤醒读者
```java
if (c > 1)
    notEmpty.signal();//唤醒其他读者？
```

#### 3.3.5. 出了队解了锁发现之前队列是满的，那么唤醒写者
```java
if (c == capacity)
	//加写锁，唤醒写者
    signalNotFull();
```
-  signalNotFull
```java
private void signalNotFull() {
	final ReentrantLock putLock = this.putLock;
	//加写锁
	putLock.lock();
	try {
		//通知写者没满，可以写了
		notFull.signal();
	} finally {
		putLock.unlock();
	}
}
```


### 3.4. offer 返回特殊值
```java
public boolean offer(E e) {
    if (e == null) throw new NullPointerException();
    final AtomicInteger count = this.count;
	if (count.get() == capacity)
		return false;
	int c = -1;
	Node<E> node = new Node<E>(e);
	final ReentrantLock putLock = this.putLock;
	putLock.lock();
	try {
		if (count.get() < capacity) {
			enqueue(node);
			c = count.getAndIncrement();
			if (c + 1 < capacity)
				notFull.signal();
		}
	} finally {
		putLock.unlock();
	}
	if (c == 0)
		signalNotEmpty();
	return c >= 0;//跟put不同的地方在这里，返回而不阻塞
}
```



### 3.5. poll 返回特殊值
```java
public E poll() {
    final AtomicInteger count = this.count;
    if (count.get() == 0)//跟take不同的地方在这里，返回null
        return null;
    E x = null;
    int c = -1;
    final ReentrantLock takeLock = this.takeLock;
    takeLock.lock();
    try {
        if (count.get() > 0) {
            x = dequeue();
            c = count.getAndDecrement();
            if (c > 1)
                notEmpty.signal();
        }
    } finally {
        takeLock.unlock();
    }
    if (c == capacity)
        signalNotFull();
    return x;
}
```


### 3.6. peek 返回特殊值
```java
public E peek() {
    if (count.get() == 0)//为空返回null
        return null;
    final ReentrantLock takeLock = this.takeLock;
    takeLock.lock();
    try {
        Node<E> first = head.next;
        if (first == null)
            return null;
        else
            return first.item;
    } finally {
        takeLock.unlock();
    }
    //不需要唤醒写着，因为没有出队
}
```


## 4. 总结

底层使用单向数组实现，可以有界也可以无界队列。
并且用了两个锁和两个condition。两个个锁说明读写可以同时进行，两个conditon说明读写相互唤醒


## 5. 参考
- [Fast Concurrent Queue Algorithms](https://www.cs.rochester.edu/research/synchronization/pseudocode/queues.html)
- [LinkedBlockingQueue 源码分析 \(基于Java 8\) \- 简书](https://www.jianshu.com/p/28c9d9e34b29)

