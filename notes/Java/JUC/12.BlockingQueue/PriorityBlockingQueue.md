[toc]



## 1. 是什么

底层使用数组（二叉堆）实现的无界的阻塞队列
读读、读写、写写相互阻塞
可以排序
由于无界，所以put操作不会阻塞，但是take操作会阻塞（队列为空的时候）

### 1.1. 二叉堆
一颗完全二叉树，堆序性质为，每个节点的值都小于其左右子节点的值，二叉堆中最小的值就是根节点。
底层用数组进行存储。对于数组中的元素 a[i]，其左子节点为 a[2*i+1]，其右子节点为 a[2*i + 2]，其父节点为 a[(i-1)/2]。
结构如下图：
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200116145205.png)

## 2. 如何使用

```java
public class PriorityBlockingQueueTest
{
    public static void main(String[] args) throws InterruptedException
    {
        PriorityBlockingQueue<String> queue = new PriorityBlockingQueue<>(1);
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


## 3. 原理分析


### 3.1. 构造方法
#### 3.1.1. 底层使用数组+Lock+Condition实现
```java
public class PriorityBlockingQueue<E> extends AbstractQueue<E>
    implements BlockingQueue<E>, java.io.Serializable {


	//底层使用数组实现（堆）
	private transient Object[] queue;
	//实际使用的长度
    private transient int size;

    //comparator确定元素的顺序，如果是null那么是自然序
    private transient Comparator<? super E> comparator;

    //只有一把锁说明读写互斥
    private final ReentrantLock lock;

	//只有一个condition说明只有读或者写的操作是阻塞的
    //当队列不为空的时候唤醒读操作
    private final Condition notEmpty;

	// 这个也是用于锁，用于数组扩容的时候，需要先获取到这个锁，才能进行扩容操作
	// 其使用 CAS 操作
	private transient volatile int allocationSpinLock;

	public PriorityBlockingQueue() {
		//默认11个，自然序
        this(DEFAULT_INITIAL_CAPACITY, null);
    }

	public PriorityBlockingQueue(int initialCapacity) {
		this(initialCapacity, null);
	}

	public PriorityBlockingQueue(int initialCapacity,
		                         Comparator<? super E> comparator) {
		if (initialCapacity < 1)
		    throw new IllegalArgumentException();
		this.lock = new ReentrantLock();
		this.notEmpty = lock.newCondition();
		this.comparator = comparator;
		this.queue = new Object[initialCapacity];
	}
}
```


### 3.2. put
```java
public void put(E e) {
    //转调offer
    offer(e); // never need to block
}
```

#### 3.2.1. 转调offer，不需要阻塞
- offer
```java
public boolean offer(E e) {
    if (e == null)
        throw new NullPointerException();
    final ReentrantLock lock = this.lock;
    //加锁
    lock.lock();
    int n, cap;
    Object[] array;
    //如果当前队列中的元素个数 >= 数组的大小，那么需要扩容了
    while ((n = size) >= (cap = (array = queue).length))
        tryGrow(array, cap);
    try {
        Comparator<? super E> cmp = comparator;
		//自然序。把e加入到数组array末尾的位置n，然后与父亲比较，若是比父亲小则交换位置
        if (cmp == null)
            siftUpComparable(n, e, array);
        else
            siftUpUsingComparator(n, e, array, cmp);
        size = n + 1;
        //唤醒读者
        notEmpty.signal();
    } finally {
        lock.unlock();
    }
    return true;
}
```

- 6行：加锁。一旦该写者加了锁，那么其他读写线程不能进来操作
- 10-11行：根据需要进行扩容
- 13-18行：插入数组末尾，并且通过上浮操作保持堆的性质
- 19行：队列中元素的实际数量+1
- 21行：其他读者可能在队列为空的时候阻塞，这里需要唤醒
由上面的代码可以看出写的时候是不需要阻塞的，因为这个队列是无界的

##### 3.2.1.1. 加锁

```java
final ReentrantLock lock = this.lock;
    //加锁
    lock.lock();
} finally {
    lock.unlock();
}
```

##### 3.2.1.2. 判断是否需要扩容
```java
//如果当前队列中的元素个数 >= 数组的大小，那么需要扩容了
    while ((n = size) >= (cap = (array = queue).length))
        tryGrow(array, cap);
```
###### 3.2.1.2.1. 需要的话进行扩容
- tryGrow
```java
private void tryGrow(Object[] array, int oldCap) {
	//为什么这里释放锁？让读的线程可以读而不至于再扩容的时候阻塞
    lock.unlock(); // must release and then re-acquire main lock
    Object[] newArray = null;
    //allocationSpinLock为0表示没有其他进行扩容，1表示有
    //当没有其他线程扩容 且 当前线程CAS加锁成功才进行扩容
    if (allocationSpinLock == 0 &&
        UNSAFE.compareAndSwapInt(this, allocationSpinLockOffset,
                                 0, 1)) {
        try {
        	//如果旧容量<64，那么新容量=2*旧容量+2
        	//否则为1.5*旧容量
            int newCap = oldCap + ((oldCap < 64) ?
                                   (oldCap + 2) : // grow faster if small
                                   (oldCap >> 1));
           //溢出判断
            if (newCap - MAX_ARRAY_SIZE > 0) {    // possible overflow
                int minCap = oldCap + 1;
                if (minCap < 0 || minCap > MAX_ARRAY_SIZE)
                    throw new OutOfMemoryError();
                newCap = MAX_ARRAY_SIZE;
            }
        	//确实有扩容 且 array没有变动--说明没有其他线程在扩容？
            if (newCap > oldCap && queue == array)
                newArray = new Object[newCap];
        } finally {
        	//释放锁
            allocationSpinLock = 0;
        }
    }
    //其他线程在扩容，让出CPU
    if (newArray == null) // back off if another thread is allocating
        Thread.yield();
    //这里有重新加锁了？扩容完毕，需要真正的修改数组了，这里需要阻塞读
    lock.lock();
    //转移旧数组到新数组
    if (newArray != null && queue == array) {
        queue = newArray;
        System.arraycopy(array, 0, newArray, 0, oldCap);
    }
}
```
##### 3.2.1.3. 把元素加入堆的末尾
```java
//自然序。把e加入到数组array末尾的位置n，然后与父亲比较，若是比父亲小则交换位置
if (cmp == null)
    siftUpComparable(n, e, array);
```
###### 3.2.1.3.1. 上浮操作调整堆
- siftUpComparable
```java
//把x，插入到堆数组array，的k位置
private static <T> void siftUpComparable(int k, T x, Object[] array) {
    Comparable<? super T> key = (Comparable<? super T>) x;
	//最多调整到root即0
    while (k > 0) {
    	//父节点的位置 (k-1)/2
        int parent = (k - 1) >>> 1;
        Object e = array[parent];
        
        //如果x比父节点大，那么退出
        if (key.compareTo((T) e) >= 0)
            break;

        //否则与父节点交换位置
        array[k] = e;
        //从父节点继续往上
        k = parent;
    }
    //走到这里说明k位置存放x满足二叉堆的性质：比父节点大，比左右孩子小
    array[k] = key;
}
```
###### 3.2.1.3.2. 调整的过程图
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200116150518.png)

### 3.3. take

```java
 public E take() throws InterruptedException {
    final ReentrantLock lock = this.lock;
    //加锁
    lock.lockInterruptibly();
    E result;
    try {
    	//出队元素为空那么阻塞等待唤醒
        while ( (result = dequeue()) == null)
            notEmpty.await();
    } finally {
    	//解锁
        lock.unlock();
    }
    return result;
}
```
- 4行：加锁。一旦该读者加了锁，那么其他读写线程不能进来操作
- 8-9行：出队，如果队列为空那么进行阻塞，等待队列不为空的时候由写者唤醒


#### 3.3.1. 加锁
```java
 final ReentrantLock lock = this.lock;
    //加锁
    lock.lockInterruptibly();
    try {
    	//...
    } finally {
    	//解锁
        lock.unlock();
    }
```
#### 3.3.2. 一直阻塞等待，直到出队成功

```java
//出队元素为空那么阻塞等待唤醒
while ( (result = dequeue()) == null)
    notEmpty.await();
```

##### 3.3.2.1. 出队具体操作
- dequeue

```java
private E dequeue() {
	//队列为空返回null
    int n = size - 1;
    if (n < 0)
        return null;
    else {
        Object[] array = queue;
        //root节点，即0号位置就是出队的元素
        E result = (E) array[0];
       
        E x = (E) array[n];//数组末尾的元素x
        array[n] = null;
        Comparator<? super E> cmp = comparator;
        if (cmp == null)
         	//把数组末尾的元素x放到0号位置，调整堆
            siftDownComparable(0, x, array, n);
        else
            siftDownUsingComparator(0, x, array, n, cmp);
        size = n;
        return result;
    }
}

```

- 7-12行：移除堆顶，末尾元素放到堆顶
- 14-18行：下沉操作调整堆

###### 3.3.2.1.1. 移除堆顶，末尾元素放到堆顶
```java
Object[] array = queue;
//root节点，即0号位置就是出队的元素
E result = (E) array[0];

E x = (E) array[n];//数组末尾的元素x
array[n] = null;
```
###### 3.3.2.1.2. 下沉操作调整堆
- siftDownComparable

```java
//把元素x，插入到长度为n，的堆数组array的，k位置
private static <T> void siftDownComparable(int k, T x, Object[] array,
                                           int n) {
    if (n > 0) {
        Comparable<? super T> key = (Comparable<? super T>)x;
        //只能在 非叶子节点（有孩子的节点）调整
        int half = n >>> 1;           
        while (k < half) {
        	//左孩子
            int child = (k << 1) + 1; // assume left child is least
            Object c = array[child];
			//右孩子
            int right = child + 1;
            if (right < n &&
                ((Comparable<? super T>) c).compareTo((T) array[right]) > 0)
                c = array[child = right];
            //c是左右孩子中较小的那个
            //如果要插入的元素比左右孩子都小，那么二叉堆性质以满足，无需调整
            if (key.compareTo((T) c) <= 0)
                break;
            //否则将较小的孩子上移
            array[k] = c;
            //继续往下调整
            k = child;
        }
        //走到这里说明k位置存放x满足二叉堆的性质：比父节点大，比左右孩子小
        array[k] = key;
    }
}
```
###### 3.3.2.1.3. 调整的过程图
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200116151142.png)

## 4. 总结

无界队列，底层使用二叉堆实现，有序。
写不阻塞，读阻塞

