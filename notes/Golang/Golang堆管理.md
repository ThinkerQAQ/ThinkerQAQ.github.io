## 1. 堆是什么
- 空间大，数据存放时间较长。堆在低地址，从低地址向高地址增长
- 分配：程序员手动分配
- 回收：GC
Go的内存管理是runtime，也就是说并不是每次内存分配都需要进行系统调用。
采用的算法是`TCMalloc`算法，即`Thread-Caching Malloc`。
他把可用的堆内存分成两级：每个线程自行维护自己独立的内存池，进行内存分配时优先从该内存池中分配，当内存池不足时才会向全局内存池申请，以避免不同线程对全局内存池的频繁竞争


## 2. 堆内存
Go启动时会向操作系统申请内存，内存划分如下
![](https://raw.githubusercontent.com/TDoct/images/master/1598088745_20200822165830538_6372.png)

- arena：堆区，Golang动态分配的内存都在这里。
    - 总大小为512GB，以8KB为一页
- bitmap：标识arena区域哪些地址保存了对象，并表示对象是否包含指针、GC标记信息
    - 由于bimap每一个B对应arena的一个指针，指针大小为8B*4=32B，而arena区域总大小为512GB，所以得出bitmap区域大小为512GB/32B=16GB
- spans：存放mspan的指针
    - 由于spans的每个指针对应spans的每一页，arena区总页数为512GB/8KB，也就是总指针数，每个指针为8B*4=32B，那么大小为512GB/8KB*8B*4

## 3. 内存管理单元
![](https://raw.githubusercontent.com/TDoct/images/master/1599380758_20200906162554419_12187.png)

- mspan：内存管理的基本单元
    - 由连续的页组成
    - 按照Size Class的大小分成若干个object，每个object可存储一个对象。

![](https://raw.githubusercontent.com/TDoct/images/master/1598089015_20200822173650037_9309.png)

## 4. 内存分配器
### 4.1. mcache
每个工作线程都会绑定一个mcache，本地缓存可用的mspan资源，这样就可以直接给Goroutine分配，因为不存在多个Goroutine竞争的情况，所以不会消耗锁资源。
### 4.2. mcentral
当工作线程的mcache中没有合适（也就是特定大小的）的mspan时就会从mcentral获取。被所有的工作线程共同享有，存在多个Goroutine竞争的情况，因此会消耗锁资源
为所有mcache提供切分好的mspan资源。每个central保存一种特定大小的全局mspan列表，包括已分配出去的和未分配出去的。
### 4.3. mheap
代表Go程序持有的所有堆空间，Go程序使用一个mheap的全局对象_mheap来管理堆内存。
当mcentral没有空闲的mspan时，会向mheap申请。而mheap没有资源时，会向操作系统申请新内存

## 5. 逃逸分析
[逃逸分析.md](逃逸分析.md)
## 6. 内存分配流程
根据[逃逸分析.md](逃逸分析.md)的结果能在栈上分配就在栈上，否则考虑堆
根据对象的大小，分成三类：小对象（小于等于16B）、一般对象（大于16B，小于等于32KB）、大对象（大于32KB）。

- 32KB 的对象，直接从mheap上分配；
- <=16B 的对象使用mcache的tiny分配器分配；
- (16B,32KB] 的对象，首先计算对象的规格大小，然后使用mcache中相应规格大小的mspan分配；
    - 如果mcache没有相应规格大小的mspan，则向mcentral申请
    - 如果mcentral没有相应规格大小的mspan，则向mheap申请
    - 如果mheap中也没有合适大小的mspan，则向操作系统申请

![go内存管理](https://raw.githubusercontent.com/TDoct/images/master/1599897112_20200912115110501_16869.png)
## 7. 参考
- [图解Go语言内存分配 \| qcrao](https://qcrao.com/2019/03/13/graphic-go-memory-allocation/)
- [可视化Go内存管理 \| Tony Bai](https://tonybai.com/2020/03/10/visualizing-memory-management-in-golang/)
- [Go语言内存管理三部曲（一）内存分配原理 \- InfoQ 写作平台](https://xie.infoq.cn/article/ee1d2416d884b229dfe57bbcc)
- [Go 语言内存分配器的实现原理 \| Go 语言设计与实现](https://draveness.me/golang/docs/part3-runtime/ch07-memory/golang-memory-allocator/)
- [Go: Memory Management and Allocation \| by Vincent Blanchon \| A Journey With Go \| Medium](https://medium.com/a-journey-with-go/go-memory-management-and-allocation-a7396d430f44)
- [🚀 Demystifying memory management in modern programming languages \| Technorage](https://deepu.tech/memory-management-in-programming/)
