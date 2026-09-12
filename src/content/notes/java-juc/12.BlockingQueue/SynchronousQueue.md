---
title: "12.4 SynchronousQueue"
description: "1. 是什么 底层使用单向实现的阻塞队列，不存储元素 一个写者必须同时有一个读者才能进行下去，反之亦然。 否则写者将会一直阻塞或者读者将会一直阻塞 2. 使用 3. 原理 3.1. 构造方法 3.1.1. Transfer 3.1.2. QNode 3.2. put 阻塞 3.2.1. 调用Tran"
sourcePath: "Java/JUC/12.BlockingQueue/SynchronousQueue.md"
category: "java-juc"
categoryLabel: "Java / JUC"
topic: "12.BlockingQueue"
topicLabel: "12.BlockingQueue"
order: 22
tags: ["Java","JUC"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-18T06:30:34Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. 是什么

底层使用单向实现的阻塞队列，不存储元素
一个写者必须同时有一个读者才能进行下去，反之亦然。
否则写者将会一直阻塞或者读者将会一直阻塞

## 2. 使用

```java
public class SynchronousQueueTest
{
    public static void main(String[] args) throws InterruptedException
    {
        SynchronousQueue <String> queue = new SynchronousQueue<>();
        CountDownLatch latch = new CountDownLatch(2);

        new Thread(()->{
            for (int i = 0;;i++)
            {
                try
                {
                 	String data = "data" + i;
                    queue.put(data);
                    System.out.println("Producer放入消息：" + data);//不支持peek操作
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

## 3. 原理

### 3.1. 构造方法
```java
public class SynchronousQueue<E> extends AbstractQueue<E>
    implements BlockingQueue<E>, java.io.Serializable {

	private transient volatile Transferer<E> transferer;
    
	public SynchronousQueue() {
		this(false);//默认不公平，即用stack
	}

	public SynchronousQueue(boolean fair) {
		transferer = fair ? new TransferQueue<E>() : new TransferStack<E>();
	}

	//单向链表头、尾
    transient volatile QNode head;
    transient volatile QNode tail;
}
```


#### 3.1.1. Transfer
```java
abstract static class Transferer<E> {
     //put和take操作都会调用这个
     //如果e为空，那么代表读者的take操作
     //如果e不为空，那么代表写着的put操作
     // 第二个参数代表是否设置超时，如果设置超时，超时时间是第三个参数的值
    // 返回值如果是 null，代表超时，或者中断。具体是哪个，可以通过检测中断状态得到。
    abstract E transfer(E e, boolean timed, long nanos);
}
```


#### 3.1.2. QNode
```java
 static final class QNode {
    volatile QNode next;          // 单向链表
    volatile Object item;         // CAS'ed to or from null
    volatile Thread waiter;       // to control park/unpark
    final boolean isData;//true表示写，false表示读
}
```


### 3.2. put 阻塞
```java
public void put(E e) throws InterruptedException {
	//写着e保证不为空
    if (e == null) throw new NullPointerException();
	//调用Transfer的transfer方法传递元素给读者
    if (transferer.transfer(e, false, 0) == null) {
        Thread.interrupted();
        throw new InterruptedException();
    }
}
```


#### 3.2.1. 调用TransferQueue
- TransferQueue transfer
```java
E transfer(E e, boolean timed, long nanos) {
    QNode s = null;
    boolean isData = (e != null);//e不为空表示写（true），为空表示读（false）

    for (;;) {
        QNode t = tail;
        QNode h = head;
        if (t == null || h == null)         // saw uninitialized value
            continue;                       // spin

		//队列为空或者队列中尾节点的模式与当前节点一样（即都是写或者都是读的情况）
		//那么直接将当前节点入队
        if (h == t || t.isData == isData) {
            QNode tn = t.next;
            //之前的tail跟当前tail不同，说明已经有节点入队了，重新来一次
            if (t != tail)                 
                continue;
            //走到这里说明tail没有改变，可以tail.next居然不为空，说明有节点入队，但是还没有修改tail
            //那么把tail指向tail.next即可
            if (tn != null) {            
                advanceTail(t, tn);//tail==t的话，把tail指向tn
                continue;
            }
            //设置了超时但是时间不对
            if (timed && nanos <= 0)
                return null;
            //构造当前节点
            if (s == null)
                s = new QNode(e, isData);
            //插入到链表尾部
            if (!t.casNext(null, s))
                continue;

			//tail==t的话，把tail指向s
            advanceTail(t, s);              
            //自旋或者阻塞等待另一个模式的线程过来唤醒
            //写线程拿到的是null，读线程拿到的是写线程的值
            Object x = awaitFulfill(s, e, timed, nanos);

            //走到这里说明已经唤醒了，继续往下执行
            if (x == s) {                   // wait was cancelled
                clean(t, s);
                return null;
            }

			//当前节点的next不是当前节点
			//那么当头节点==尾节点的时候，CAS设置头为当前节点
            if (!s.isOffList()) {           // not already unlinked
                advanceHead(t, s);          // unlink if head
                if (x != null)              // and forget fields
                    s.item = s;
                s.waiter = null;
            }
            return (x != null) ? (E)x : e;

        } 
		//一读一写刚好匹配的情况
        else {                           
        	//头节点的next是当前节点
            QNode m = h.next;   
            //头节点或者尾节点或者头节点的next为空了，即链表改变了，重新开始            
            if (t != tail || m == null || h != head)
                continue;                   

            //失败重试的情况
            Object x = m.item;
            if (isData == (x != null) ||    // m already fulfilled
                x == m ||                   // m cancelled
                !m.casItem(x, e)) {         // lost CAS
                advanceHead(h, m);          // dequeue and retry
                continue;
            }

			//CAS需改头节点。如果h==head，那么修改头节点为当前节点
            advanceHead(h, m);              // successfully fulfilled
            //唤醒当前节点的线程。对应awaitFulfill
            LockSupport.unpark(m.waiter);
		
            return (x != null) ? (E)x : e;
        }
    }
}
```

- advanceTail
```
void advanceTail(QNode t, QNode nt) {
	//如果当前尾节点==传过来的尾节点的话
    if (tail == t)
    	//CAS操作修改尾节点指针指向nt
        UNSAFE.compareAndSwapObject(this, tailOffset, t, nt);
}
```

- awaitFulfill

```java
//要么自旋、要么阻塞
Object awaitFulfill(QNode s, E e, boolean timed, long nanos) {
    //设置了超时，那么计算超时到期的时间
    final long deadline = timed ? System.nanoTime() + nanos : 0L;
    Thread w = Thread.currentThread();
    //头节点的下一个节点就是我自己了，那么我不入队，而是自旋等待
    int spins = ((head.next == s) ?
                 (timed ? maxTimedSpins : maxUntimedSpins) : 0);
    for (;;) {
		//当前线程被中断了，那么将当前节点的item属性CAS设置为e
        if (w.isInterrupted())
            s.tryCancel(e);
        //这里是这个方法的唯一的出口
        //当前节点的item属性跟e不同的时候
        Object x = s.item;
        if (x != e)
            return x;
        //超时了，那么将当前节点的item属性CAS设置为e
        if (timed) {
            nanos = deadline - System.nanoTime();
            if (nanos <= 0L) {
                s.tryCancel(e);
                continue;
            }
        }
    	//每次循环自旋-1
        if (spins > 0)
            --spins;
        //走到这里说明自旋到了最大次数或者没有设置自旋

        //当前节点还没关联线程，那么关联
        else if (s.waiter == null)
            s.waiter = w;
        //没有设置超时，那么阻塞
        else if (!timed)
            LockSupport.park(this);
        else if (nanos > spinForTimeoutThreshold)
            LockSupport.parkNanos(this, nanos);
    }
}

```
- tryCancel
```java
void tryCancel(Object cmp) {
    UNSAFE.compareAndSwapObject(this, itemOffset, cmp, this);
}
```

- advanceHead
```java
void advanceHead(QNode h, QNode nh) {
    if (h == head &&
        UNSAFE.compareAndSwapObject(this, headOffset, h, nh))
        h.next = h; // forget old next
}
```


### 3.3. take 阻塞
```java
public E take() throws InterruptedException {
	//调用Transfer的transfer方法从写者获取元素
    E e = transferer.transfer(null, false, 0);
    if (e != null)
        return e;
    Thread.interrupted();
    throw new InterruptedException();
}
```


## 4. 总结

不存储元素，吞吐量比LinkedBlockingQueue高
读、写必须匹配才能进行下去，否则会加入队列阻塞等待，直到另一个模式的线程到来唤醒

## 5. 参考
- [并发编程之 SynchronousQueue 核心源码分析 \- 掘金](https://juejin.im/post/5ae754c7f265da0ba76f8534)