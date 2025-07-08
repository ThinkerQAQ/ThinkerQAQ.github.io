[toc]


我们可以自己动手写一个简单的AQS，以更好地理解AQS实际的源码


## 1. 需求
1. 锁是排他的，一旦这个锁被某个线程占有，只要这个锁没被释放，他就不能被其他线程占有。因此需要保存当前占有锁的线程

2. 要有一个单独的字段表示当前锁的状态，是空闲还是已被占有

3. 同一时间有很多线程抢占锁，只有一个线程能成功，那其他线程怎么办呢？
一是要让其他线程暂时停止抢占锁，即阻塞这些线程；既然有了阻塞，那必然有唤醒操作，占有锁的线程在释放锁的同时需要唤醒其他阻塞等待锁的线程
4. 另外需要用一个队列保存抢占锁失败的线程以便后续唤醒继续抢占锁，注意这个队列的操作得是线程安全的。



## 2. 定义属性
### 2.1. 锁的排他性
1.考虑用一个字段`Thread lockHolder`表示当前占有锁的线程，在多线程情况下为了保证这个变量改动后能及时被其他线程感知，使用`volatile`修饰

```java
public class MyLock
{
    //表示当前持有锁的线程
    private volatile Thread lockHolder;
}
```
### 2.2. 锁的状态
2. 使用`int state`表示锁的状态，0表示空闲未被占有，1表示已被占有，对他的操作必须保证是原子的，使用CAS；同样在多线程情况下为了保证这个变量改动后能及时被其他线程感知，使用`volatile`修饰

```java
public class MyLock
{
    //表示加锁状态。记录加锁的次数
    private volatile int state = 0;
    //...
}
```
Java中使用CAS操作需要一个Unsafe类的实例，如下：

```java
public class MyLock
{
    //...
    
    private static final Unsafe unsafe = UnsafeInstance.getInstance();
    //state变量的偏移地址。通过unsafe实现CAS操作的时候需要用到
    private static final long stateOffset;

    static
    {
        try
        {
            stateOffset = unsafe.objectFieldOffset(MyLock.class.getDeclaredField("state"));
        }catch (Exception e)
        {
            throw new Error();
        }
    }
    //CAS操作设置state
    public final boolean compareAndSwapState(int except, int update)
    {
        return unsafe.compareAndSwapInt(this, stateOffset, except, update);
    }


    //通过反射的方式获取Unsafe实例
    private static class UnsafeInstance
    {
        public static Unsafe getInstance()
        {
            try
            {
                Field field = Unsafe.class.getDeclaredField("theUnsafe");
                field.setAccessible(true);
                return (Unsafe) field.get(null);
            }
            catch (Exception e)
            {
                e.printStackTrace();
            }
            return null;
        }
    }
}
```
### 2.3. 阻塞、唤醒线程
3. 使用`LockSupport.unpark`阻塞线程，使用`LockSupport.park`唤醒线程
### 2.4. 使用队列保存抢占锁失败的线程
4. 线程安全的queue考虑使用`ConcurrentLinkedQueue`，如下

```java
public class MyLock
{
    //保存未获取的线程
    private ConcurrentLinkedQueue<Thread> waiters = new ConcurrentLinkedQueue<>();
    //...
}
```

- 整理上述代码
```java
public class MyLock
{
    //表示加锁状态。记录加锁的次数
    private volatile int state = 0;
    //表示当前持有锁的线程
    private volatile Thread lockHolder;
    //保存未获取的线程
    private ConcurrentLinkedQueue<Thread> waiters = new ConcurrentLinkedQueue<>();

    //==================UNSAFE======================//
    private static final Unsafe unsafe = UnsafeInstance.getInstance();
    //state变量的偏移地址。通过unsafe实现CAS操作的时候需要用到
    private static final long stateOffset;

    static
    {
        try
        {
            stateOffset = unsafe.objectFieldOffset(MyLock.class.getDeclaredField("state"));
        }catch (Exception e)
        {
            throw new Error();
        }
    }
    //CAS操作设置state
    public final boolean compareAndSwapState(int except, int update)
    {
        return unsafe.compareAndSwapInt(this, stateOffset, except, update);
    }


    //通过反射的方式获取Unsafe实例
    private static class UnsafeInstance
    {
        public static Unsafe getInstance()
        {
            try
            {
                Field field = Unsafe.class.getDeclaredField("theUnsafe");
                field.setAccessible(true);
                return (Unsafe) field.get(null);
            }
            catch (Exception e)
            {
                e.printStackTrace();
            }
            return null;
        }
    }  
```

## 3. 添加加锁、解锁操作
### 3.1. 基本流程
伪代码如下：

- 检查锁的状态
- 如果没有线程占用锁那么尝试抢占锁（CAS原子操作）
- 抢占成功设置当前占有锁的线程
- 抢占失败入队阻塞

```java
//加锁的操作
public void lock()
{

    Thread currentThread = Thread.currentThread();
    int state = getState();
    //state==0表示没有加锁
    if (state == 0)
    {
        //CAS设置成功即加锁成功
        if (compareAndSwapState(0, 1))
        {
            setLockHolder(currentThread);//设置当前持有锁的线程
            return;
        }
    }
    

    //获取锁失败，入队
    waiters.add(currentThread);

    //获取锁失败阻塞当前线程
    LockSupport.park(currentThread);//由unpark唤醒
    
}


```

- 解锁
伪代码如下：
- 解锁的线程（即当前线程）必须是占有锁的线程
- 是的话使用CAS解锁
- 解锁成功则置当前占有锁的线程为空，必须唤醒阻塞的线程

```java
public void unlock()
{
    //加锁和解锁的线程必须相同
    if (Thread.currentThread() != lockHolder)
    {
        throw new RuntimeException("current thread is not lockHolder");
    }

    //CAS设置state成功，解锁
    int state = getState();
    if (compareAndSwapState(state, 0))
    {
        setLockHolder(null);
        //唤醒等待锁的所有线程
        for (Thread waiter : waiters)
        {
           LockSupport.unpark(head);//唤醒park 
        }
        
    }
}

```
### 3.2. 唤醒后继续抢占锁
上面的加锁代码被唤醒后需要再次尝试获取锁，如果失败则阻塞；被唤醒后再次尝试获取锁.....
直到成功设置当前线程为占有锁的线程，并且把当前线程从等待队列中移除
可以看出这是一个死循环，修改加锁代码如下：
```java
public void lock()
{
    //加锁成功
    if (acquire())
    {
        return;
    }

    //获取锁失败，入队
    Thread currentThread = Thread.currentThread();
    waiters.add(currentThread);

    for (;;)
    {
        //不停的尝试获取锁
        if (acquire())
        {
            return;
        }
        //获取锁失败阻塞当前线程
        LockSupport.park(currentThread);//由unpark唤醒
    }
}

private boolean acquire()
{
    Thread currentThread = Thread.currentThread();
    int state = getState();
    //state==0表示没有加锁
    if (state == 0)
    {
        //CAS设置成功即加锁成功
        if (compareAndSwapState(0, 1))
        {
            waiters.remove(Thread.currentThread());//拿到锁了从等待队列中移除
            setLockHolder(currentThread);//设置当前持有锁的线程
            return true;
        }
    }
    return false;
}

```
### 3.3. 加入公平锁的特性
所谓公平锁就是遵循先到先得的原则。加锁失败的线程会放入队列中进而阻塞，当占有锁的线程释放锁成功后应该唤醒等待时间最长的线程（队头），让他去尝试抢占锁。
修改代码如下：

```java
public void lock()
{
    //加锁成功
    if (acquire())
    {
        return;
    }

    //获取锁失败，入队
    Thread currentThread = Thread.currentThread();
    waiters.add(currentThread);

    for (;;)
    {
        //队列中为空（没有人等待）或者是队头（我才是第一个等待）才能去获取锁这才公平
        //不停的尝试获取锁
        if ((waiters.isEmpty() || currentThread == waiters.peek()) && acquire())
        {
            return;
        }
        //获取锁失败阻塞当前线程
        LockSupport.park(currentThread);//由unpark唤醒
    }
}

private boolean acquire()
{
    Thread currentThread = Thread.currentThread();
    int state = getState();
    //state==0表示没有加锁
    if (state == 0)
    {
        //队列为空（即前面没人等待锁我才去尝试加锁，这样才公平）
        //又或者当前线程就是队头才去尝试加锁
        //CAS设置成功即加锁成功
        if ((waiters.isEmpty() || currentThread == waiters.peek()) && compareAndSwapState(0, 1))
        {
            waiters.poll();//拿到锁了从等待队列中移除
            setLockHolder(currentThread);//设置当前持有锁的线程
            return true;
        }
    }
    return false;
}

public void unlock()
{
    //加锁和解锁的线程必须相同
    if (Thread.currentThread() != lockHolder)
    {
        throw new RuntimeException("current thread is not lockHolder");
    }

    //CAS设置state成功，解锁
    int state = getState();
    if (compareAndSwapState(state, 0))
    {
        setLockHolder(null);
        //唤醒等待锁的队头线程
        Thread head = waiters.peek();
        if (head != null)
        {
            LockSupport.unpark(head);//唤醒park
        }
    }
}
```

## 4. 最终定版
```java
public class MyLock
{
    //表示加锁状态。记录加锁的次数
    private volatile int state = 0;
    //表示当前持有锁的线程
    private volatile Thread lockHolder;
    //保存未获取的线程
    private ConcurrentLinkedQueue<Thread> waiters = new ConcurrentLinkedQueue<>();

    public void lock()
    {
        //加锁成功
        if (acquire())
        {
            return;
        }

        //获取锁失败，入队
        Thread currentThread = Thread.currentThread();
        waiters.add(currentThread);

        for (;;)
        {
            //队列中为空（没有人等待）或者是队头（我才是第一个等待）才能去获取锁这才公平
            //不停的尝试获取锁
            if ((waiters.isEmpty() || currentThread == waiters.peek()) && acquire())
            {
                return;
            }
            //获取锁失败阻塞当前线程
            LockSupport.park(currentThread);//由unpark唤醒
        }
    }

    private boolean acquire()
    {
        Thread currentThread = Thread.currentThread();
        int state = getState();
        //state==0表示没有加锁
        if (state == 0)
        {
            //队列为空（即前面没人等待锁我才去尝试加锁，这样才公平）
            //又或者当前线程就是队头才去尝试加锁
            //CAS设置成功即加锁成功
            if ((waiters.isEmpty() || currentThread == waiters.peek()) && compareAndSwapState(0, 1))
            {
                waiters.poll();//拿到锁了从等待队列中移除
                setLockHolder(currentThread);//设置当前持有锁的线程
                return true;
            }
        }
        return false;
    }

    public void unlock()
    {
        //加锁和解锁的线程必须相同
        if (Thread.currentThread() != lockHolder)
        {
            throw new RuntimeException("current thread is not lockHolder");
        }

        //CAS设置state成功，解锁
        int state = getState();
        if (compareAndSwapState(state, 0))
        {
            setLockHolder(null);
            //唤醒等待锁的队头线程
            Thread head = waiters.peek();
            if (head != null)
            {
                LockSupport.unpark(head);//唤醒park
            }
        }
    }

    public int getState()
    {
        return state;
    }

    public void setState(int state)
    {
        this.state = state;
    }

    public Thread getLockHolder()
    {
        return lockHolder;
    }

    public void setLockHolder(Thread lockHolder)
    {
        this.lockHolder = lockHolder;
    }


    //==================UNSAFE======================//

    private static final Unsafe unsafe = UnsafeInstance.getInstance();
    //state变量的偏移地址。通过unsafe实现CAS操作的时候需要用到
    private static final long stateOffset;

    static
    {
        try
        {
            stateOffset = unsafe.objectFieldOffset(MyLock.class.getDeclaredField("state"));
        }catch (Exception e)
        {
            throw new Error();
        }
    }
    //CAS操作设置state
    public final boolean compareAndSwapState(int except, int update)
    {
        return unsafe.compareAndSwapInt(this, stateOffset, except, update);
    }


    //通过反射的方式获取Unsafe实例
    private static class UnsafeInstance
    {
        public static Unsafe getInstance()
        {
            try
            {
                Field field = Unsafe.class.getDeclaredField("theUnsafe");
                field.setAccessible(true);
                return (Unsafe) field.get(null);
            }
            catch (Exception e)
            {
                e.printStackTrace();
            }
            return null;
        }
    }

    
}
```

## 5. 测试
```java
private static int result = 0;
public static void main(String[] args) throws InterruptedException
{
    final int threadCound = 10000;
    final CyclicBarrier barrier = new CyclicBarrier(threadCound);
    final CountDownLatch countDownLatch = new CountDownLatch(threadCound);
    final MyLock lock = new MyLock();

    for (int i = 0; i < threadCound; i++)
    {
        String name = "thread-" + i;
        new Thread(()->{
            try
            {
                barrier.await();
                lock.lock();
                result++;
                System.out.println(Thread.currentThread() + " result: " + result);
            }
            catch (Exception e)
            {
                e.printStackTrace();
            }
            finally
            {
                lock.unlock();
                countDownLatch.countDown();
            }
        }, name).start();
    }

    countDownLatch.await();

    System.out.println(result);

}
```

## 6. 流程

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200115100210.png)