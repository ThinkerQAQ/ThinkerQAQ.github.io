[toc]

## 1. 设计调优
- 创建mapping阶段
    - 设计合理的字段，使用Java封装复杂的操作，直接写入到ES中。避免复杂操作，如join、nested、parent-child等
    - 设置最小的最合适的数据类型。byte，short，integer，long。如果最小的类型就合适，那么就用最小的类型。能keyword类型尽量keyword
    - 设置合理的分词器
    - 设置各个字段的属性，是否需要检索、是否需要存储等

- 索引的管理
    - 使用别名进行索引管理
    - 基于日期模板创建索引，通过roll over API滚动创建索引
    - 每天凌晨定时对索引做force_merge操作，以释放空间
    - 采取冷热分离机制，热数据存储到SSD，提高检索效率冷数据并且定期进行shrink操作，以缩减存储
    - 采取curator进行索引的生命周期管理
- 缓存预热
    - 对于一些热数据，我们可以写个缓存预热系统每隔一段时间访问，刷到os cache中


## 2. 写入调优
- 尽量使用自动生成的id
- 写入前禁用replica：将replica shards设置为1；写入前禁用刷新机制。把refresh_interval设置为-1
- 写入过程中采取bulk批量写入
- 使用多线程将数据写入es
- 写入后恢复副本数和刷新间隔


## 3. 查询调优

- 数据量大时候，可以先基于时间敲定索引再检索
- 分页性能优化
    - 深分页效率很低
    原因是比如每页10条，查询第100页。也就是查询第990-1000条数据
    ES的会把每个shard上的1000的数据都读到协调节点上，比如5个shard，那么就是5000条数据，对这5000条数据进行合并、处理、在获取真正的100页的10条数据
    [Elasticsearch CRUD流程.md](Elasticsearch%20CRUD流程.md)
    - 可以用scroll search代替
    原理是保存当前数据的一个快照，缺点是只能一页页的往下翻，类似于微博下拉，不能随意的翻页，否则效率更慢
- 禁用wildcard，禁用批量terms（成百上千的场景）
- 设置合理的路由机制

## 4. 部署调优

- Linux
    - OS Cache
        - ES会先从操作系统的cache中查询数据，查不到再从磁盘中查找，所以系统内存尽可能大
        - 一般情况下至少是数据量的一半大小。比如ES数据1T，那么内存至少512G
        - ES只存储少量的用于查询的字段，展示的字段从hbase或者mysql中查询
    - 磁盘存储raid方式——存储有条件使用RAID10，增加单节点性能以及避免单节点存储故障
    - 设置Linux系统至少可以创建2048个线程：`ulimit -u 2048`
    - 设置最大虚拟内存：`sysctl -w vm.max_map_count=262144`
    - 设置最大文件描述符：`ulimit -n 65536`
- ES
    - 禁用swapping：`bootstrap.memory_lock: true`
    - 最小最大堆内存设置为：`Min（系统内存/2, 32GB）`
    - 随时增加节点以便动态扩容


## 5. 参考
- [系统设置](https://elasticsearch.apachecn.org/#/docs/43)
- [ES索引写入性能优化\_数据库\_Jimmy的专栏\-CSDN博客](https://blog.csdn.net/zhuzhuba008/article/details/77483199)
- [ES搜索性能优化\_数据库\_Jimmy的专栏\-CSDN博客](https://blog.csdn.net/zhuzhuba008/article/details/77712263)
- [elasticsearch 优化写入速度 \| easyice](https://www.easyice.cn/archives/207#i-4)
- [Elasticsearch：从写入原理谈写入优化 \- 知乎](https://zhuanlan.zhihu.com/p/366785695)
