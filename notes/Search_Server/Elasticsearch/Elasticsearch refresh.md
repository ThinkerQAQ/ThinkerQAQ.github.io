## 1. 什么是refresh
- Elasticsearch的一个操作，会把memory buffer中的数据刷入fliesystem cache，之后就可searchable


## 2. 为什么需要refresh
- make index searchable
    - 注意refresh后的数据是在filtesystem cache中的，没有持久化到磁盘，可能丢失数据。因此Elasticsearch提供了[Elasticsearch translog.md](Elasticsearch%20translog.md)
    - 只有执行了[Elasticsearch flush.md](Elasticsearch%20flush.md)操作之后才会把segment file持久化到磁盘

## 3. 为什么不直接fsync到磁盘
- refresh操作相对fsync操作更轻量，虽然牺牲了数据可靠性
## 4. refresh触发时机
### 4.1. 手动
- 可以使用POST /my_index/_refresh强制刷新
### 4.2. 自动
- 默认每秒refresh一次
- 可以设置refresh间隔
    ```json
    PUT /my_index/_settings
        {
          "index" : {
            "refresh_interval" : -1
          }
        }
    ```
## 5. refresh过程
把memory buffer中的数据写入filesystem cache，此时会生成一个 lucene segment file

## 6. 参考
- [Refresh API \| Elasticsearch Guide \[7\.13\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-refresh.html)
- [深入理解Elasticsearch写入过程 \- Elastic 中文社区](https://elasticsearch.cn/article/13533)
- [理解ES的refresh、flush、merge\_三思的博客\-CSDN博客](https://blog.csdn.net/weixin_37692493/article/details/108182161)