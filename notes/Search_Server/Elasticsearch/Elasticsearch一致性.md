## 1. 什么是一致性
- [分布式一致性.md](../../System_Design/分布式系统/分布式一致性.md)
- 就是Elasticsearch的Index上的document会先写入primary shard，然后同步到replica shard上，如何保证primary和replica shard上的数据一致性

## 2. consistency参数
### 2.1. 是什么
```json
put /index/type/id?consistency=quorum
```

- one（primary shard）
    - 要求我们这个写操作，只要有一个 primary shard 是 active 活跃可用的，就可以执行
- all（all shard）
    - 要求我们这个写操作，必须所有的 primary shard 和 replica shard 都是活跃的，才可以执行这个写操作
- quorum（default）
    - 默认的值，要求所有的 shard中，必须是大部分的 shard 都是活跃的，可用的，才可以执行这个写操作
### 2.2. 作用
> Index operation return when all live/active shards have finished indexing, regardless of consistency param. Consistency param may only prevent the operation to start if there are not enough available shards(nodes).
## 3. 参考
- [Elasticsearch read and write consistency \- Stack Overflow](https://stackoverflow.com/questions/38414504/elasticsearch-read-and-write-consistency)
- [Reading and Writing documents \| Elasticsearch Guide \[7\.13\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-replication.html)
- [Index API \| Elasticsearch Guide \[2\.4\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/2.4/docs-index_.html#index-consistency)
- [Creating, Indexing, and Deleting a Document \| Elasticsearch: The Definitive Guide \[2\.x\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/guide/current/distrib-write.html)