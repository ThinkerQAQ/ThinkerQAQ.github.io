[toc]

 

## 1. HashMap1.7 vs HashMap1.8

|                              | HashMap1.7 |   HashMap1.8    |
| ---------------------------- | ---------- | --------------- |
| 数据结构                     | 数组+链表   | 数组+链表+红黑树 |
| 冲突时链表中是头插法还是尾插法 | 头插       | 尾插            |

- 1.7对于一个key，先计算其Hash值再对数组大小取模决定放在那个元素上，再通过连地址法解决冲突。如果很多key映射到同一个元素上，那么效率退化成O（N），因此1.8在链表超过阈值的时候会转成红黑树，效率为O（logN）
- 1.7两个线程同时put并且resize的时候会出现环形链表的情况，所以get操作会出现死循环


## 2. HashMap vs Hashtable


|                       |     HashMap     |       Hashtable        | ConcurrentHashMap1.7 | ConcurrentHashMap1.8 |
| --------------------- | --------------- | ---------------------- | -------------------- | -------------------- |
| 是否线程安全           | 否               | 是                     | 是                   | 是                   |
| key、value是否能为null | key、value都可以 | key、value都不可以      | key、value都不可以    | key、value都不可以    |
| 怎么实现线程安全的      | /                | 每个方法加了sychronized | 分段锁               | synchronized+cas     |

- Hashtable、ConcurrentHashMap1.7、ConcurrentHashMap1.8都是通过减小锁的粒度来提高并发度的。
    - Hashtable在每个方法之前加了synchronized，读的时候不能写，写的时候不能读
    - ConcurrentHashMap1.7则是数组+数组+链表的结构，他把一整个map分成多个segment，多线程读写同一个segment的时候需要阻塞等待锁，读写不同的segment不用阻塞等待锁
    -  ConcurrentHashMap1.8去掉了segment，粒度改为锁每个元素的链表头。如果head为空通过CAS操作，否则加synchronized



## 3. TreeMap vs LinkedHashMap vs HashMap

|             |     HashMap     |           LinkedHashMap           |              TreeMap               |
| ----------- | --------------- | --------------------------------- | ---------------------------------- |
| 数据结构     | 数组+链表+红黑树 | HashMap+双向链表                     | 红黑树                              |
| 遍历是否有序 | 无序            | 遍历的时候是按照key插入的顺序访问的 | 遍历的时候是按照key的compareTo方法顺序来访问的 |



