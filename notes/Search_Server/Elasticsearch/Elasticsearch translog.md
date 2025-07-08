[toc]
 

## 1. translog是什么
Elasticsearch执行写入操作（index或者delete）的时候会把该操作写入日志


## 2. 为什么需要translog
- 防止宕机造成数据丢失
    - Elasticsearch的数据**refresh**进入filesystem cache会即searchable，如果这个时候宕机了，那么数据就丢失了，但是如果执行**flush**操作刷入磁盘又太慢了
    - 而translog是顺序写磁盘的日志，因此速度很快
    - 但是注意，translog一开始也是在内存中的，只有执行 **fsync（不是flush）** 刷入磁盘才能保证数据不丢失
- 提供实时CRUD
    - 按ID检索，更新或删除文档时，它会首先检查translog中是否有任何最近的更改，然后再尝试从相关segment中检索文档。 这意味着它始终可以实时访问最新的已知文档版本

## 3. translog fsync时机
- 如果`index.translog.durability`是`request`（默认），那么每次写入操作都会fsync到磁盘
- 如果`index.translog.durability`是`async`，那么达到以下情况之一才会fsync进入磁盘
    - translog大小达到`index.translog.flush_threshold_size`，默认512mb
    - 时间达到`index.translog.sync_interval`，默认5s
## 4. 参考
- [Translog \| Elasticsearch Guide \[7\.13\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-translog.html)
- [es flush时间 和 translog fsync时间的疑惑 \- Elastic 中文社区](https://elasticsearch.cn/question/3847)
- [理解ES的refresh、flush、merge\_三思的博客\-CSDN博客](https://blog.csdn.net/weixin_37692493/article/details/108182161)