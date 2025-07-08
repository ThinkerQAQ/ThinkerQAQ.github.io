## 1. Elasticseach是什么
- 基于Lucene开发的全文搜索引擎：
    - 全文搜索引擎
    - Lucene功能很强大，但是API特别繁杂，Elasticseach对其进行了封装。如下Elasticseach特性

## 2. Elasticseach特性
- 支持分布式：水平扩容支持海量数据
- 支持近实时写入查找：写入到可以搜索接近1s
- 支持数据分析：类似于SQL统计功能

从ACID看，D是通过translog实现，I是通过乐观锁解决了脏写，A好像没有实现
## 3. Elasticseach安装
- [Elasticsearch安装.md](Elasticsearch安装.md)
## 4. Elasticsearch使用
- [Elasticsearch使用.md](Elasticsearch使用.md)

- [Elasticsearch并发控制.md](Elasticsearch并发控制.md)
- [Elasticsearch分词器.md](Elasticsearch分词器.md)
## 5. Elasticseach原理
### 5.1. 倒排索引
[Elasticsearch索引实现.md](Elasticsearch索引实现.md)
### 5.2. 分布式架构
[Elasticsearch架构.md](Elasticsearch架构.md)
## 6. Elasticsearch优化
[Elasticsearch优化.md](Elasticsearch优化.md)
## 7. Elasticsearch MySQL同步
[Elasticsearch和MySQL的同步.md](Elasticsearch和MySQL的同步.md)
## 8. 云Elasticsearch
[云Elasticsearch.md](云Elasticsearch.md)
## 9. 参考
- [Field datatypes \| Elasticsearch Reference \[7\.6\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html)
- [干货 \| BAT等一线大厂 Elasticsearch面试题解读\-阿里云开发者社区](https://developer.aliyun.com/article/707137)
- [2019年常见Elasticsearch 面试题答案详细解析 \- 知乎](https://zhuanlan.zhihu.com/p/99539109)
- [Elasticsearch: The Definitive Guide \[master\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/guide/master/index.html)
- [Elasticsearch: The Definitive Guide \(豆瓣\)](https://book.douban.com/subject/25868239/)
- [Elasticsearch: 权威指南 \| Elastic](https://www.elastic.co/guide/cn/elasticsearch/guide/current/index.html)
- [wjw465150/Elasticsearch: Elasticsearch Chinese Guide](https://github.com/wjw465150/Elasticsearch)
- [Elasticsearch: 权威指南](https://es.0xl2oot.cn/)