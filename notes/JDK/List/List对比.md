[toc]

 

## 1. ArrayList vs LinkedList


前者底层实现是数组，因此根据索引查询快，增删慢，同时容量不够的时候需要扩容，扩容为1.5倍
后者底层实现是双向链表，因此根据索引查询慢、增删快，不需要扩容


## 2. Vector vs ArrayList

Vector是线程安全的
Vector扩容为原来的两倍，ArrayList为原来的1.5倍


## 3. SynchronizedList vs Vector

一样是线程安全的，只不过前者的应用更广，可以将任意list转换成线程安全的
前者使用同步代码块，后者使用同步方法

## 4. 参考
- [SynchronizedList和Vector的区别\-HollisChuang's Blog](https://www.hollischuang.com/archives/498)
