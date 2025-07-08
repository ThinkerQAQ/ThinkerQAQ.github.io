## 1. Elasticsearch并发控制机制是什么
- 多个请求同时修改相同的数据，可能会有并发问题（**丢失更新**），这就需要并发控制机制来解决
- 并发控制机制无非两种，悲观锁和乐观锁
    - Elasticsearch采用乐观锁机制： 不可变的segment file+版本号
        - 不可变的segment file：
            - 跟Java String一样，不可变意味着没有并发问题。而数据库则是通过加行锁解决的
        - 版本号：
            - 用于解决请求的顺序性问题
            - 而数据库也是一样的。参考[数据库乐观锁与悲观锁.md](../../Database/数据库乐观锁与悲观锁.md)，先把数据以及版本号查询出来，更新的时候对比版本号是否一致，是则更新，否则返回错误给用户，让他重试
            - Elasticsearch在6.7版本之前使用version，之后使用seq_no+primary_term

## 2. 为什么需要Elasticsearch并发控制

- 一方面解决了在单节点并发修改数据的顺序性问题
    - MySQL等并发修改数据也有这个问题，参考[数据库乐观锁与悲观锁.md](../../Database/数据库乐观锁与悲观锁.md)
- 另一方面解决了primary shard复制给replica shard的顺序性问题
    - Elasticsearch primary shard执行完CUD操作后，需要并行、异步的复制给replica shard，由于网络的原因复制的请求到达replica shard可能不是按顺序的。
    - 为了防止旧复制请求晚于新复制请求达到，以致旧版本文档覆盖了新版本文档，需要一个并发控制机制
    - 为什么Kafka、MySQL、Redis不会有这个问题
        - Redis、Kafka、MySQL是基于日志的复制，日志是有顺序的，所以不存在这个问题
        - Elasticsearch则是由primary shard并行同步请求发送给replica shard同步，网络请求是无法保证顺序的，所以有这个问题
## 3. 如何使用Elasticsearch并发控制
### 3.1. Elasticsearch 6.7 version机制
1. 生成version
    - 创建Document的时候会自动生成version
        ```json
        PUT /website/blog/1/_create
        {
          "title": "My first blog entry",
          "text":  "Just trying this out..."
        }

        GET /website/blog/1
        {
          "_index" :   "website",
          "_type" :    "blog",
          "_id" :      "1",
          "_version" : 1,
          "found" :    true,
          "_source" :  {
              "title": "My first blog entry",
              "text":  "Just trying this out..."
          }
        }
        ```
2. version冲突检测
    - 内部version：只有当version匹配时才更新
        ```json
        PUT /website/blog/1?version=1
        {
          "title": "My first blog entry",
          "text":  "Starting to get the hang of this..."
        }
        ```
    - 外部version：只有当version大于原version才更新
        ```json
        PUT /website/blog/2?version=5&version_type=external
        {
          "title": "My first external blog entry",
          "text":  "Starting to get the hang of this..."
        }
        ```

### 3.2. Elasticsearch 7 seq_no+primary_term机制


## 4. 并发冲突举例
### 4.1. 409 version conflict
- update_by_id和delete_by_id不会发生这个错误，而执行update_by_query或者delete_by_query操作的时候都有可能发生这个错误
    - 两次update_by_id是没问题的
        1. 关闭refresh
        ```json
        PUT /tb_item/_settings
        {
          "index" : {
            "refresh_interval" : -1
          }
        }
        ```
        2. 根据ID更新
        ```json
        POST /tb_item/_update/968185
        {
          "doc": {
            "sellPoint": "test1"
          }
        }
        ```
        3. 再根据ID更新
        ```json
        POST /tb_item/_update/968185
        {
          "doc": {
            "sellPoint": "test2"
          }
        }
        ```
        4. 手动refresh
        ```json
        POST /tb_item/_refresh
        ```
        5. 结果
        ```json
        GET /tb_item/_search
        {
          "query": {
            "ids" : {
              "values" : ["968185"]
            }
          }
        }
        ```
    - 先是update_by_id，没有refresh，然后delete_by_query会报错
        1. 关闭refresh
        ```json
        PUT /tb_item/_settings
        {
          "index" : {
            "refresh_interval" : -1
          }
        }
        ```
        2. 根据ID更新
        ```json
        POST /tb_item/_update/968185
        {
          "doc": {
            "sellPoint": "test1"
          }
        }
        ```
        3. 再delete_by_query
        ```json
        POST /tb_item/_delete_by_query
        {
          "query": {
            "match": {
              "id": "968185"
            }
          }
        }
        ```
        4. 结果
        ```json
        {
          "took": 1,
          "timed_out": false,
          "total": 1,
          "deleted": 0,
          "batches": 1,
          "version_conflicts": 1,
          "noops": 0,
          "retries": {
            "bulk": 0,
            "search": 0
          },
          "throttled_millis": 0,
          "requests_per_second": -1,
          "throttled_until_millis": 0,
          "failures": [
            {
              "index": "tb_item",
              "type": "_doc",
              "id": "968185",
              "cause": {
                "type": "version_conflict_engine_exception",
                "reason": "[968185]: version conflict, required seqNo [1000], primary term [7]. current document has seqNo [1001] and primary term [7]",
                "index_uuid": "jOSL4QJNTkWa7p1Z9s-ztQ",
                "shard": "0",
                "index": "tb_item"
              },
              "status": 409
            }
          ]
        }
        ```
#### 4.1.1. 原因分析
1. 首先执行根据ID更新的操作
    1. 参考[Elasticsearch CRUD流程.md](Elasticsearch%20CRUD流程.md)
    2. 此时的结果是document写入了memory buffer但没有refresh到filesystem cache，同时写入了translog并fsync到磁盘
2. 然后执行delete_by_query操作
    1. 参考[Elasticsearch CRUD流程.md](Elasticsearch%20CRUD流程.md)
    2. 此时的结果是primary节点拿到的旧document的version+id，然后发起删除，然后从translog中删除的时候发现version不匹配，于是报错
#### 4.1.2. 解决
- 在根据ID更新和delete_by_query之间强制refresh`POST /tb_item/_refresh`，保证delete_by_query拿到的是最新版本的数据
## 5. 参考
- [Elasticsearch delete\_by\_query 409 version conflict \- Elastic Stack / Elasticsearch \- Discuss the Elastic Stack](https://discuss.elastic.co/t/elasticsearch-delete-by-query-409-version-conflict/174150)
- [ElasticSearch6\.7使用\_delete\_by\_query产生版本冲突（version conflict）问题\_学无止境，永不停歇\-CSDN博客](https://blog.csdn.net/qq_41878532/article/details/109533239)
- [乐观并发控制 \| Elasticsearch: 权威指南 \| Elastic](https://www.elastic.co/guide/cn/elasticsearch/guide/current/optimistic-concurrency-control.html)
- [并发控制\_百度百科](https://baike.baidu.com/item/%E5%B9%B6%E5%8F%91%E6%8E%A7%E5%88%B6)
- [elasticsearch学习笔记（十三）——Elasticsearch乐观锁并发控制实战 \- SegmentFault 思否](https://segmentfault.com/a/1190000018931191)
- [Optimistic concurrency control \| Elasticsearch Guide \[7\.13\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html)
- [Relation between "\_version", "\_seq\_no" and "\_primary\_term" \- Elastic Stack / Elasticsearch \- Discuss the Elastic Stack](https://discuss.elastic.co/t/relation-between-version-seq-no-and-primary-term/179647)