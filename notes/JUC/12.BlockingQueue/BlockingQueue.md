[toc]

 

## 1. 是什么

线程安全的阻塞队列。
特点：

- 先进先出：
既然是队列那肯定是先进先出
- 阻塞
支持在插入元素时，如果队列已满，那么阻塞，等待队列非满
也支持在删除元素时，如果队列为空，那么阻塞，等待队列非空
- 无界有界
数组容量的大小。无界其实是Integer.MAX_VALUE
- 线程安全

## 2. 使用场景
生产者、消费者

## 3. 如何使用


| 方法\处理方式 |  抛出异常  | 返回特殊值 |   一直阻塞   |        超时退出         |
| ------------ | --------- | --------- | ----------- | ---------------------- |
| 插入方法      | add(e)    | offer(e)  | **put(e)**  | **offer(e,time,unit)** |
| 移除方法      | remove()  | poll()    | **take()** | **poll(time,unit)**  |
| 检查方法      | element() | peek()    | 不可用      | 不可用                  |



## 4. 各种BlockingQueue详解以及对比

|                                     |                ArrayBlockingQueue                |         LinkedBlockingQueue          | PriorityBlockingQueue |    SynchronousQueue     |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------ | --------------------- | ----------------------- |
| 数据结构                             | 数组                                             | 单向链表                              | 数组（二叉堆）         | 单向链表                |
| 怎么实现阻塞                         | Lock+Condition                                   | Lock+Condition                       | Lock+Condition        | CAS+LockSupport         |
| 有界/无界                            | 有界                                             | 有界                                 | 无界                  | 无界（不存储元素）       |
| 吞吐量（以LinkedBlockingQueue为基准） | 比LinkedBlockingQueue低（读读、读写、写写相互阻塞） | / （读读、写写相互阻塞，读写不相互阻塞） | 无界（读读、读写、写写相互阻塞）                  | 比LinkedBlockingQueue高（读写匹配才能进行下去） |
| 有界/无界                            | 有界                                             | 有界                                 | 无界                  | 无界（不存储元素）       |

- [ArrayBlockingQueue.md](ArrayBlockingQueue.md)
- [LinkedBlockingQueue.md](LinkedBlockingQueue.md)
- [PriorityBlockingQueue.md](PriorityBlockingQueue.md)

    