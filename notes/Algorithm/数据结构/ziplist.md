## 1. 什么是ziplist
- Redis底层的一种数据结构，用于实现list、zset
- 一段连续的内存空间
## 2. 为什么需要ziplist
- 动态数组：由长度+元素列表组成。每个元素占用的空间大小相同，类型也是相同的
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1624891120_20210628223050497_29436.png =500x)
- ziplist：也由长度+元素列表组成。不同之处在于
    - 每个元素占用的空间大小可以不同，因此可以节省内存
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1624891122_20210628223615834_11110.png =500x)
## 3. 参考
- [9\.1\.1 The ziplist representation \| Redis Labs](https://redislabs.com/ebook/part-2-core-concepts/01chapter-9-reducing-memory-use/9-1-short-structures/9-1-1-the-ziplist-representation/)
- [剖析Redis常用数据类型对应的数据结构\_every\_\_day的博客\-CSDN博客\_redis的数据类型的数据结构](https://blog.csdn.net/every__day/article/details/91363204)