
[toc]


了解了计算机底层知识后，再来看JMM就容易多了

## 1. 为什么需要JMM

之前提到过内存模型规定了程序的内存操作（读操作和写操作）所有可能的执行顺序中哪些是正确的，而不同的处理器架构有不同的内存模型，Java作为一个跨平台（OS和硬件）的语言，为了屏蔽底层的这些差异，定义了自己的内存模型：JMM

## 2. 什么是JMM
JMM描述了Java中的多个线程之间如何通过内存交互的，同时他还描述了单线程执行代码的语义


### 2.1. JMM的定义
百度百科的解释：
> Java语言规范中提到过，JVM中存在一个主存区（Main Memory或Java Heap Memory），Java中所有变量都是存在主存中的，对于所有线程进行共享，而每个线程又存在自己的工作内存（Working Memory），工作内存中保存的是主存中某些变量的拷贝，线程对所有变量的操作并非发生在主存区，而是发生在工作内存中，而线程之间是不能直接相互访问，变量在程序中的传递，是依赖主存来完成的。而在多核处理器下，大部分数据存储在高速缓存中，如果高速缓存不经过内存的时候，也是不可见的一种表现。在Java程序中，内存本身是比较昂贵的资源，其实不仅仅针对Java应用程序，对操作系统本身而言内存也属于昂贵资源，Java程序在性能开销过程中有几个比较典型的可控制的来源。synchronized和volatile关键字提供的内存中模型的可见性保证程序使用一个特殊的、存储关卡（memory barrier）的指令，来刷新缓存，使缓存无效，刷新硬件的写缓存并且延迟执行的传递过程，无疑该机制会对Java程序的性能产生一定的影响。

线程与主内存的读写操作如下：
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200114110026.png)
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200114110106.png)

### 2.2. 再看看JMM对多线程操作内存的解释

#### 2.2.1. 可见性
- 解释：Thread A更改了主内存中某个共享变量的时候，其他Thread什么时候看到这个更新
- 产生的原因：每个线程都有一个工作内存，缓存了主内存的数据
- 解答：由happens-before解答

#### 2.2.2. 有序性
- 解释：Thread A对多个共享变量进行更新，其他Thread以何种顺序感知到这种变化
- 产生的原因：处理器重排序、编译器重排序
- 解答：由happens-before解答

#### 2.2.3. 原子性
- 解释：Thread A执行一个复合操作的时候，其他Thread是否可以看到中间的状态
- 产生的原因：CPU只保证基本的读取、修改、写回操作的原子性，如果保证复合操作的原子性开销太大
- 解答：long、double之外的所有基本类型的读写都具有原子性


## 3. 程序员如何理解JMM
JMM某种意义也算得上是“底层”，我们开发的时候只需要理解JMM对程序员提供的happens-before规则
### 3.1. happens-before
如果A happens-before B，那么A操作的结果对于B可见
### 3.2. 解释
这并不意味着时间上A必须先于B执行，而是说如果时间上A是在B之前执行的，那么A之前的所有写操作造成的影响都对B之后的操作可见
### 3.3. 举例
> 对一个monitor的解锁操作happens-before后续对同一个monitor的加锁操作

这句话并不是说解锁要在加锁之前完成，而是解锁（之前的所有写操作）对加锁（之后的所有读操作）可见



### 3.4. 常见happens-before规则
- 程序顺序
一个线程内，代码中顺序是怎样的，那么实际执行的时候就是怎样的顺序。【as-if-serial】
当然如果没有数据依赖关系，其实是可以重排序的。

- 内部锁
线程A对于锁X的释放发生于线程B对于锁X的申请之前

- volatile
某个volatile变量的写发生于对这个volatile变量读之前

- 线程启动
Thread.start发生于其他Thread中任何操作之前

- 线程终止
Thread的其他操作发生于Thread.join之前

#### 3.4.1. happens-before规则的传递性
happens-before具有传递性，衍生出很多其他规则

## 4. JSR 133
JSR133是为了解决JDK1.5之前内存模型的缺陷提出的。
JDK1.5之前的缺陷
 - 允许一个线程先看到final的默认值再看到初始值，即final字段的值实际上可能是变化的
 - 允许volatile写与其他非volatile读写重排序


## 5. 参考
- [Java memory model \- Wikipedia](https://en.wikipedia.org/wiki/Java_memory_model)
- [啃碎并发（11）：内存模型之重排序 \- 掘金](https://juejin.im/post/5bd971096fb9a0222205d56e)[Java 内存模型 JMM 深度解析 \- 掘金](https://juejin.im/post/5a27ab3851882546d71f36e1)
- [再有人问你Java内存模型是什么，就把这篇文章发给他。\-HollisChuang's Blog](http://www.hollischuang.com/archives/2550)
- [深入理解java内存模型系列文章 \| 并发编程网 – ifeve\.com](http://ifeve.com/java-memory-model-0/)
- [java内存模型\_百度百科](https://baike.baidu.com/item/java%E5%86%85%E5%AD%98%E6%A8%A1%E5%9E%8B)
- [Java Memory Model Pragmatics \(transcript\)](https://shipilev.net/blog/2014/jmm-pragmatics/)