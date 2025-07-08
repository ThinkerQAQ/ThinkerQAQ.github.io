[toc]

## 1. 写入数据

1. 客户端随机选取一个node发送写请求
2. 这个node作为协调节点，根据_id计算document应该在哪个shard上，即`hash(_id) % number_of_primary_shards`，然后根据cluster state获取该shard在哪个node上面
3. 将请求路由到相应的node的primary shard上
4. primary shard执行写入
    1. primary shard把数据写入memory buffer
        - [Elasticsearch refresh.md](Elasticsearch%20refresh.md)
    2. primary shard把数据写入transaction log
        - [Elasticsearch translog.md](Elasticsearch%20translog.md)
5. primary shard把数据并行发给replica shard
6. replica shard同步完成响应primary shard成功
5. primary shard返回给协调节点成功
6. 协调节点返回客户端成功

- ![ES写入数据-ES写入流程](https://raw.githubusercontent.com/TDoct/images/master/1645773367_20220225151343049_9398.png)


## 2. 删除数据

### 2.1. 根据ID删除
1. 客户端随机挑选一个节点发送ID删除请求
2. 这个node作为协调节点，根据_id计算document应该在哪个shard上，即`hash(_id) % number_of_primary_shards`，然后根据cluster state获取该shard在哪个node上面
3. 协调节点将请求路由到primary shard
4. primary shard执行删除操作
    1. primary shard把数据写入memory buffer
        - commit的时候会把这条记录写入.del文件，标识这条记录已经从segment中删除。此时该文档依然能匹配查询，但是会在结果中被过滤掉
        - [Elasticsearch refresh.md](Elasticsearch%20refresh.md)
    2. primary shard把数据写入transaction log
        - flush的时候会执行segment合并，在.del文件中的数据不会写入新的segment中
        - [Elasticsearch translog.md](Elasticsearch%20translog.md)
5. primary shard把删除请求并行发给replica shard
6. replica shard同步完成响应primary shard成功
5. primary shard返回给协调节点成功
6. 协调节点返回客户端成功

### 2.2. delete_by_query
1. 客户端随机挑选一个节点发送delete_by_query请求
2. 这个node作为协调节点，将delete_by_query请求路由到所有的primary shard
3. 每个primary shard执行删除操作
    1. 先查找相关的document（主要包括version+id）
    2. 然后执行根据ID删除操作，同时对比translog中的version（**这里有疑问：Elasticsearch keeps tracks of the sequence number and primary term of the last operation to have changed each of the documents it stores.**），发现不匹配则报错version conflict，否则删除成功
4. 每个primary shard并行发送删除操作给replica shard
5. replica shard返回primary shard删除成功
5. primary shard返回协调节点删除成功
6. 协调节点返回客户端删除成功

- 举例
    ```json
    //关闭自动refresh
    PUT /tb_item/_settings
    {
      "index" : {
        "refresh_interval" : -1
      }
    }
    //删除
    POST /tb_item/_delete_by_query
    {
      "query": {
        "match": {
          "id": "936920"
        }
      }
    }
    //搜索时依然可以搜出来
    GET /tb_item/_search
    {
      "query": {
        "ids" : {
          "values" : ["936920"]
        }
      }
    }
    //根据ID更新时会报错文档不存在
    POST /tb_item/_update/936920
    {
      "doc": {
        "sellPoint": "test1"
      }
    }
    ```
## 3. 查询数据


### 3.1. 根据ID查询
1. 客户端随机挑选一个节点发送读请求
2. 这个node作为协调节点，根据_id计算document应该在哪个shard上，即`hash(_id) % number_of_primary_shards`，然后根据cluster state获取该shard在哪个node上面
3. 协调节点将请求路由到primary shard或者replica shard
4. shard获取document返回给协调节点
5. 协调节点将数据返回给客户端


### 3.2. 关键词查询
1. 客户端随机挑选一个节点发送读请求
2. 这个node作为协调节点，将读请求路由到所有的shard（primary shard或者replica shard都可以）
3. 每个shard将自己查到的document的关键信息（包括_id）返回给协调节点，协调节点进行数据的合并、排序、分页等操作，产生最终结果。这个操作叫做query phase
4. 协调节点拿着最终的_id到各个节点上拉去实际的document数据，返回给客户端。这个操作叫做fetch phase

为啥需要分成两个phase而不是一个phase呢？比如每个shard把自己查询到的文档的全部信息直接返回协调节点，原因在于全部返回数据量太大了

#### 3.2.1. 分页查询
1. 客户端随机挑选一个节点发送读请求获取10条数据
2. 这个node作为协调节点，将读请求路由到所有的shard（primary shard或者replica shard都可以）
3. 每个shard将自己查到的前10条的document的关键信息（包括_id）返回给协调节点，协调节点进行数据的合并、排序、分页等操作，产生最终的10条结果。这个操作叫做query phase
4. 协调节点拿着最终的_id到各个节点上拉去实际的document数据，返回给客户端。这个操作叫做fetch phase

## 4. 更新数据

### 4.1. 根据ID更新
1. 删除
    1. 参考**根据ID删除**
2. 写入
    1. 参考**写入数据**，version+1
### 4.2. update_by_query
1. 客户端随机挑选一个节点发送update_by_query请求
2. 这个node作为协调节点，将读请求路由到所有的shard（primary shard或者replica shard都可以）
3. 每个primary shard执行更新操作
    1. 先查找相关的document（主要包括version+id）
    2. 然后执行根据ID更新操作，同时对比translog中的version（**这里有疑问：Elasticsearch keeps tracks of the sequence number and primary term of the last operation to have changed each of the documents it stores.**），发现不匹配则报错version conflict，否则更新成功
4. 每个primary shard并行发送更新操作给replica shard
5. replica shard返回primary shard更新成功
5. primary shard返回协调节点更新成功
6. 协调节点返回客户端更新成功
## 5. 参考

- [Elasticsearch 数据写入流程 \| liuzhihang](https://liuzhihang.com/2019/03/12/elasticsearch-data-writing-procElasticsearchs.html)
- [ElasticSearch 内部机制浅析（一） \| 茅屋为秋风所破歌](https://leonlibrariElasticsearch.github.io/2017/04/15/ElasticSearch%E5%86%85%E9%83%A8%E6%9C%BA%E5%88%B6%E6%B5%85%E6%9E%90%E4%B8%80/)
- [ElasticSearch 内部机制浅析（二） \| 茅屋为秋风所破歌](https://leonlibrariElasticsearch.github.io/2017/04/20/ElasticSearch%E5%86%85%E9%83%A8%E6%9C%BA%E5%88%B6%E6%B5%85%E6%9E%90%E4%BA%8C/)
- [Cache 和 Buffer 都是缓存，主要区别是什么？ \- 知乎](https://www.zhihu.com/quElasticsearchtion/26190832)
- [elasticsearch 的translog是直接写入硬盘还是内存？ \- Elastic 中文社区](https://elasticsearch.cn/quElasticsearchtion/5327)
- [持久化变更 \| Elasticsearch: 权威指南 \| Elastic](https://www.elastic.co/guide/cn/elasticsearch/guide/current/translog.html)
- [Day 7 \- Elasticsearch中数据是如何存储的 \- Elastic 中文社区](https://elasticsearch.cn/article/6178)
- [Optimistic concurrency control \| Elasticsearch Guide \[7\.13\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html)
- [elasticsearch \- Elastic Search \- IS “Fetch” phase really needed during seach \- Stack Overflow](https://stackoverflow.com/questions/61907406/elastic-search-is-fetch-phase-really-needed-during-seach)