[toc]

 

## 1. HashMap1.7 vs HashMap1.8

- 1.8添加使用了红黑树
    - 故1.8内部实现是数组+链表+红黑树
    - 1.8之前是数组+链表实现的。对于一个key，先计算其Hash值再对数组大小取模决定放在那个元素上，再通过连地址法解决冲突。如果很多key映射到同一个元素上，那么效率退化成O（N），因此1.8在链表超过阈值的时候会转成红黑树，效率为O（logN）
- 1.8解决了并发resize时的死循环问题


## 2. HashMap vs Hashtable

1.7中
 - 计算下标的方法不同
`(hash & 0x7FFFFFFF) % tab.length;`

 - 每个方法加了synchronized
 - value不能为null


## 3. Hashtable vs ConcurrentHashMap

 - Hashtable、ConcurrentHashMap1.7、ConcurrentHashMap1.8都是通过减小锁的粒度来提高并发度的。
    - Hashtable在每个方法之前加了synchronized，读的时候不能写，写的时候不能读
     - ConcurrentHashMap1.7则是数组+数组+链表的结构，他把一整个map分成多个segment，多线程读写同一个segment的时候才需要加锁，读写不同的segment不用加锁
    -  ConcurrentHashMap1.8去掉了segment，粒度改为锁每个元素的链表头。如果head为空通过CAS操作，否则加synchronized

## 4. LinkedHashMap vs HashMap

 - 底层使用数组+双向链表实现
 - 遍历的时候是按照插入的顺序访问的

## 5. TreeMap vs HashMap

 - 底层使用的红黑树实现，效率是O（logN）
 - 遍历的时候是按照key的自然顺序来访问的

