## 1. 是什么
- log-structured merge-tree
- 一种数据结构，用于write-heavy的场景
## 2. 为什么LSM适合写多读少
- 利用了磁盘顺序写的速度快于磁盘随机写
## 3. 数据结构
### 3.1. SSTables
- Sorted Strings Table
    - 数据持久化到磁盘使用的数据结构是SSTables
- 分成多个文件，叫做segment
    - 每个segment由根据key排序好的kv对组成
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1621522452_20210520200511159_2908.png)


### 3.2. B+Tree
[MySQL索引底层实现.md](../../Database/MySQL/MySQL索引底层实现.md)
### 3.3. 稀疏索引
[稀疏索引.md](稀疏索引.md)
### 3.4. BloomFilter
[BloomFilter.md](BloomFilter.md)
## 4. 操作



### 4.1. 写入

- 先写入内存中的B树，膨胀到一定程度刷入磁盘中的SSTables
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1621522483_20210520201158447_19821.png)
- 为了避免数据丢失也会先写到WAL文件中。
- 内存里的数据结构会定时或者达到固定大小会刷到磁盘。这些磁盘上的文件不会被修改
### 4.2. 读取
- 通过BloomFliter过滤不存在的，存在的通过稀疏索引二分查找
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1621522474_20210520201138557_9810.png)
### 4.3. 压缩
- 随着磁盘上积累的文件越来越多，会定时的进行合并操作，消除冗余数据，减少文件数量。
- 多个segment合并成一个segment
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1621522454_20210520201112422_5273.png)
### 4.4. 删除
把记录标记为删除，压缩的时候会干掉

## 5. B树 vs LSM树
- LSM适合写多，B树适合读多
- 顺序写入通常比随机写入快得多，所以SSTable通常的写入性能是相对优秀的。
- 由于SSTable压缩与清理的线程存在，通常会有较低的存储开销。但是压缩和清理磁盘的过程之中会与正常的请求服务产生磁盘竞争，导致吞吐量的下降。
- 由于SSTable会存在同一个键值的多个副本，对于实现事务等对于一致性要求更高的场景，树型索引会表现的更加出色。
## 6. 总结
![1](https://raw.githubusercontent.com/TDoct/images/master/1621522449_20210520171025877_25035.png)

可以看到LSM tree核心思想就是通过内存写和后续磁盘的顺序写入获得更高的写入性能，避免了随机写入。但同时也牺牲了读取性能，因为同一个key的值可能存在于多个HFile中。为了获取更好的读取性能，可以通过bloom filter和compaction得到
## 7. 参考
- [How do LSM Trees work?](https://yetanotherdevblog.com/lsm/)
- [十分钟看懂时序数据库 \- 存储](https://juejin.cn/post/6844903477856960526#comment)
- [深入理解什么是LSM\-Tree \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1441835)