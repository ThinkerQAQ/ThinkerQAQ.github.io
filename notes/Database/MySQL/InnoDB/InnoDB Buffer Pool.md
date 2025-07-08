## 1. Buffer Pool是什么
- MySQL启动时向操作系统申请的连续的内存空间

## 2. 为什么需要Buffer Pool
- 磁盘和CPU的速度差异太大，因此需要内存作为缓存
- 在InnoDB访问表和索引数据时会在其中进行高速缓存，大量减少磁盘IO操作，提升效率
## 3. Buffer Pool工作流程
- 读数据时向从Buffer Pool中读，有的话直接返回，没有再去磁盘读，然后放入Buffer Pool
- 写的时候写Buffer Pool，定时刷入磁盘
## 4. Buffer Pool如何实现

### 4.1. 分页
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620489806_20210508235408219_28467.png)
    - 把Buffer Pool分成跟页大小一样的缓存页
    - 每个缓存页都在开头分配一个控制块，存储该页所属的表空间编号、页号、缓存页在 Buffer Pool 中的地址、链表节点信息等
### 4.2. free链表
- 用于区分 Buffer Pool 中哪些缓存页是空闲的，哪些已经被使用了呢
- 把所有空闲的缓存页对应的控制块作为一个节点放到一个链表中
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620489811_20210509000240958_24275.png)
### 4.3. Hash表
- 用于查看一个页是否在缓存中
- 用 表空间号 + 页号 作为 key ，缓存页 作为 value 创建一个哈希表

### 4.4. LRU链表
- free链表中没有空闲空间了，那么可以把Buffer Pool中的冷页驱逐出去，加载新数据
- 驱逐算法选用LRU：链表+Hash
### 4.5. flush链表
- 用于存储Buffer Pool中修改过的脏页
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620489824_20210509000248959_20188.png)
## 5. 使用Buffer Pool
### 5.1. 配置大小

```cnf
[server]
#单位Byte
innodb_buffer_pool_size = 268435456
```

### 5.2. 查看信息