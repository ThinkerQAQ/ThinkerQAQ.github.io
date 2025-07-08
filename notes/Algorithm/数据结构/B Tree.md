## 1. B Tree是什么
- self-balance search tree中的一种
- 是个多叉查找树
    - ![](https://media.geeksforgeeks.org/wp-content/uploads/20200506235136/output253.png)
## 2. 为什么需要B Tree

### 2.1. 背景
- 数据库查询的需求：
    - 根据某个值查找数据，比如`select * from user where id=1234；`
    - 根据区间值来查找某些数据，比如`select * from user where id > 1234 and id < 2345`
- 数据量大的情况下要存放在磁盘上的，因此涉及磁盘IO。
    - 根据`磁盘总IO时间=磁盘IO次数*每次的IO时间`，由于每次IO的时间是固定的，那么磁盘总IO时间视乎磁盘IO次数而定
- 空间局部性原理：如果某个数据被访问，那么他周围的数据很可能很快被访问。
    - 根据空间局部性原理，磁盘读取某条数据的时候不是一次只读一条，而是读很多条，准确说是若干个Block（每个Block是512Bytes），即一页（一般为 4 k，8 k或 16 k）
### 2.2. HashMap
- 优点：HashMap根据某个值查找效率为O(1)
- 问题：根据区间值查找数据效率为O(N)，因为key是没有排序的
### 2.3. 有序数组
- 优点：二分查找效率为O(logN)
- 问题：往中间插入一个记录就必须得挪动后面所有的记录，成本太高；同时数组需要连续的存储空间
### 2.4. 有序链表
- 优点：不需要连续的存储空间；插入删除不需要移动其他元素
- 缺点：即使有序查找效率仍为O（N）
### 2.5. 跳表
- 优点：增删查改效率为O(logN)
- 缺点：高度太高，数据量大时IO次数多
### 2.6. 二叉平衡树（红黑树、AVL树）
- 优点：二叉平衡树根据某个值查找效率为O(logN)，根据区间值查找数据可以中序遍历效率为O(N)
- 问题：
    - 二叉树每个节点只能存放一个key，数据量大的时候树会非常高，而树高就是磁盘的IO次数，那么树越高磁盘总IO时间越长
    - 为什么树高就是磁盘IO次数？
        - 由于树的节点之间是用指针连接的不是连续的的一段内存，因此可以假设每次IO读取一个节点，这样磁盘IO次数大致相当于二叉树的高度


### 2.7. B Tree

- B树把更多的key放在一个node中，因此相当于二叉树它更宽且更矮。因此可以减少磁盘访问的次数
- 另外每个node存储多少个key好？因为操作系统是按照页的大小加载数据，因此可以把每个node的大小设计成和页大小一致


### 2.8. B+Tree
- 非叶子节点只存key，不存value。因此一次IO可以加载更多的key用于筛选
- 叶子节点使用双向链表串起来。因此范围查询更快
## 3. 平衡二叉树 vs B树
- B类树与二叉搜索树最大的不同是每个节点允许有多个子节点，不只是两个
    - 平衡二叉树
        - ![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229194440.png)
    - B树
        - ![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229194454.png)
- 假设我们读的是20这个节点，二叉搜索树只能读20这个节点以及附近的不相关的数据，而B树则可以读20...50...70这一大串相关的数据

## 4. B+Tree vs B Tree
- B-树
    - ![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229194129.png)
- B+树
    - ![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229194141.png)
- 如图所示，B-树和B+树最大的不同是
1. 前者的非叶子节点除了存储查找的key之外还储存了data；后者只存储key
    - 这个特点使B+树在一次IO内可以比B-树读取更多的key用于查找
2. 前者的叶子节点不冗余key，后者冗余并且还顺序连接起来
    - 这个特点使B+树更适合范围查找

## 5. 参考
- [Introduction of B\-Tree \- GeeksforGeeks](https://www.geeksforgeeks.org/introduction-of-b-tree-2/)
- [一文详解：什么是B树？ \- 知乎](https://zhuanlan.zhihu.com/p/59788528)
- [从 MongoDB 及 Mysql 谈B/B\+树\_IT小小鸟～～\-CSDN博客](https://blog.csdn.net/wwh578867817/article/details/50493940)

