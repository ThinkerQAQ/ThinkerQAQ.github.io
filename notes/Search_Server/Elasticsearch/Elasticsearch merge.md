## 1. 什么是merge
- Elasticsearch中shard就是Lucene Index，而Lucene Index由segments组成
- 这个segment是不可变的，merge操作就是把多个小的segment合并成一个大的
## 2. 为什么需要merge
- 每次refresh都会生成一个小的segment，随着时间推移segment会越来越多，而每次search时都需要扫描所有的segment，这会导致查询效率降低
- 执行物理删除[Elasticsearch数据读写流程.md](Elasticsearch数据读写流程.md)
## 3. merge触发时机
### 3.1. 自动
### 3.2. 手动
```json
POST /my-index-000001/_forcemerge
```

```json
POST /my_index/_optimize?max_num_segments=1
```
## 4. merge过程
## 5. 参考
- [Merge \| Elasticsearch Guide \[7\.13\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-merge.html)
- [Force merge API \| Elasticsearch Guide \[7\.13\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-forcemerge.html#indices-forcemerge)
- [理解ES的refresh、flush、merge\_三思的博客\-CSDN博客](https://blog.csdn.net/weixin_37692493/article/details/108182161)