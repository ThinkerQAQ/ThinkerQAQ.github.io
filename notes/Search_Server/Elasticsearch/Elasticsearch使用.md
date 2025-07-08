## 1. 数据类型
### 1.1. String
- text：会进行分词
- keyword：不会进行分词。相当于旧版的not_analyzed
### 1.2. Numeric
long, integer, short, byte, double, float
### 1.3. Date
date：2015-01-01、2015-01-01T12:10:30Z、1420070400001
### 1.4. Boolean
boolean


## 2. Restful API使用
### 2.1. 集群管理

#### 2.1.1. 检查集群的健康状况
```json
GET /_cat/health?v

epoch      timestamp cluster       status node.total node.data shards pri relo init unassign pending_tasks max_task_wait_time active_shards_percent
1546235661 13:54:21  elasticsearch yellow          1         1      1   1    0    0        1             0                  -                 50.0%

```

- 解释：
    - cluster：集群名
    - status
        - green：每个索引的 primary shard 和 replica shard 都是 active 状态的
        - yellow：每个索引的 primary shard 都是 active 状态的，但是部分 replica shard 不是 active 状态，处于不可用的状态
        - red：不是所有索引的 primary shard 都是 active 状态的，部分索引有数据丢失了
    - node.total：master+data node数目
    - node.data：data node数目
    - unassign：未分配数量
    - active_shards_percent：可用 shards 百分比


#### 2.1.2. 查看集群中有哪些索引
```json
GET /_cat/indices?v

health status index   uuid                   pri rep docs.count docs.deleted store.size pri.store.size
yellow open   .kibana id1SV_oGSjyGosKxeJApww   1   1          1            0      3.1kb          3.1kb

```



### 2.2. 索引操作
#### 2.2.1. 创建索引
```json
PUT /test_index?pretty
```

#### 2.2.2. 删除索引
```json
// 删除的单个
DELETE /my_index
// 删除多个
DELETE /index_one,index_two
// 通配符删除
DELETE /index_*
// 删除所有
DELETE /_all
```


### 2.3. mapping操作

#### 2.3.1. 创建mapping
```json
PUT /my_index
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "my_type": {
      "properties": {
        "my_field": {
          "type": "text"
        }
      }
    }
  }
}


```

#### 2.3.2. 定制 dynamic mapping策略
有如下三种可选：
- true：遇到陌生字段，就进行 dynamic mapping
- false：遇到陌生字段，就忽略
- strict：遇到陌生字段，就报错

```json
# 全局strict策略，遇到address改成true策略
PUT /my_index
{
    "mappings": {
        "my_type": {
            "dynamic": "strict",
            "properties": {
                "title": {
                    "type": "text"
                },
                "address": {
                    "type": "object",
                    "dynamic": "true"
                }
            }
        }
    }
}
```

#### 2.3.3. 查看 mapping 信息
```json
GET /my_index/_mapping/my_type
```

#### 2.3.4. 分词器

```json
# 新增字段指定分词器
PUT /my_index/_mapping/my_type
{
  "properties": {
    "content": {
      "type": "text",
      "analyzer": "my_analyzer"
    }
  }
}

# 测试分词器
GET /my_index/_analyze
{
  "text": "tom&jerry are a friend in the house, <a>, HAHA!!",
  "analyzer": "my_analyzer"
}
```

### 2.4. Document操作
#### 2.4.1. 创建Document
```json
PUT /ecommerce/product/1
{
    "name" : "gaolujie yagao",
    "desc" :  "gaoxiao meibai",
    "price" :  30,
    "producer" :      "gaolujie producer",
    "tags": [ "meibai", "fangzhu" ]
}

{
  "_index": "ecommerce",
  "_type": "product",
  "_id": "1",
  "_version": 1,//版本号，可用于实现乐观锁
  "result": "updated",
  "_shards": {
    "total": 2,//primary+replica shards总共多少
    "successful": 1,//成功写入多少个shard
    "failed": 0//失败几个shard
  },
  "created": false
}
```

语法：/index/type/id，新版本的已经去除type了
ES会自动创建index，不需要我们提前创建
ES创建文档的时候，如果这个ID已经存在了，那么会把旧的删除，新建一个新的文档，ID相同，version+1
如果想要实现创建的时候已存在就报错，那么用`PUT /index/type/id/_create`

##### 2.4.1.1. 数据路由
一个 index 的数据会被分为多个shard，创建document的时候需要决定这个doc路由在哪个shard上

- 路由算法

```
shard = hash(routing value) % number_of_primary_shards

```
- 指定routing value
默认使用的是_id，可以指定其他字段`put /index/type/id?routing=user_id`

#### 2.4.2. 查询Document

##### 2.4.2.1. Query String
就是把参数拼接在URL后面

###### 2.4.2.1.1. 根据ID查询

```
GET /ecommerce/product/1
```

###### 2.4.2.1.2. 查询所有

```
GET /ecommerce/product/_search


{
  "took": 2,//耗费了几毫秒
  "timed_out": false,//是否超时，这里是没有
  "_shards": {//请求到达的分片结果
    "total": 5,//总共分成了5个shard，请求会打到所有的primary shard（当然打到replica shard也行）
    "successful": 5,//成功响应的shard数目
    "failed": 0
  },
  "hits": {
    "total": 2,//查询结果的数量
    "max_score": 1,//分数越高，越匹配
    "hits": [//包含了匹配搜索的 document 的详细数据
      {
        "_index": "ecommerce",
        "_type": "product",
        "_id": "2",
        "_score": 1,
        "_source": {
          "name": "jiajieshi yagao",
          "desc": "youxiao fangzhu",
          "price": 25,
          "producer": "jiajieshi producer",
          "tags": [
            "fangzhu"
          ]
        }
      },
      {
        "_index": "ecommerce",
        "_type": "product",
        "_id": "3",
        "_score": 1,
        "_source": {
          "name": "zhonghua yagao",
          "desc": "caoben zhiwu",
          "price": 40,
          "producer": "zhonghua producer",
          "tags": [
            "qingxin"
          ]
        }
      }
    ]
  }
}
 
```

##### 2.4.2.2. Query DSL
使用RequestBody方式传参

##### 2.4.2.3. match_all
查询所有
- select * from product

```json
GET /ecommerce/product/_search
{
  "query": {
    "match_all": {}
  }
}
```

##### 2.4.2.4. match
先分词，然后用or或者and查询

- select * from product where name like '%yagao%'

```json
GET /ecommerce/product/_search
{
  "query": {
    "match": {
      "name": "yagao"
    }
  }
}


GET /ecommerce/product/_search
{
  "query": {
    "bool": {
      "must":     { "match": { "name": "yagao" }}
    }
  }
}
```

- select * from product where name like '%yagao%' or name like '%maojin%'

```json
GET /ecommerce/product/_search
{
  "query": {
    "match": {
      "name": "yagao maojin"
    }
  }
}

```
- select * from article where title like '%yagao%' and title like '%maojin%'

```json
GET /forum/article/_search
{
    "query": {
        "match": {
            "title": {
          		"query": "java elasticsearch",
          		"operator": "and"
   	        }
        }
    }
}



# 至少匹配3个以上
GET /forum/article/_search
{
    "query": {
        "match": {
            "title": {
          		"query": "java elasticsearch spark hadoop",
          		"minimum_should_match": "75%"
   	        }
        }
    }
}


```

match -> term + should

```json
{
    "match": { "title": "java elasticsearch"}
}
//转换为
{
  "bool": {
    "should": [
      { "term": { "title": "java" }},
      { "term": { "title": "elasticsearch"}}
    ]
  }
}
 
```

```json
{
    "match": {
        "title": {
            "query":    "java elasticsearch",
            "operator": "and"
        }
    }
}
//转换为
{
  "bool": {
    "must": [
      { "term": { "title": "java" }},
      { "term": { "title": "elasticsearch"   }}
    ]
  }
}
```

```json
{
    "match": {
        "title": {
            "query":                "java elasticsearch hadoop spark",
            "minimum_should_match": "75%"
        }
    }
}
转换为
{
  "bool": {
    "should": [
      { "term": { "title": "java" }},
      { "term": { "title": "elasticsearch"   }},
      { "term": { "title": "hadoop" }},
      { "term": { "title": "spark" }}
    ],
    "minimum_should_match": 3
  }
}
 
```

##### 2.4.2.5. term
按字段精确查询，一般用于keyword、date、integer类型
match query如果要检索的 field是 not_analyzed 类型的，那么相当于 term query。

- select * from product where name = 'yagao'

```json
GET /ecommerce/product/_search
{
  "query": {
    "term": {
      "name": "yagao"
    }
  }
}
```

- select * from product where name = 'yagao maojin'

```json
GET /ecommerce/product/_search
{
  "query": {
    "term": {
      "name": "yagao maojin"
    }
  }
}
```

##### 2.4.2.6. match_phrase
不分词，整句匹配

- select * from product where name like '%yagao producer%'

```json
GET /ecommerce/product/_search
{
    "query" : {
        "match_phrase" : {
            "producer" : "yagao producer"
        }
    }
}



{
  "took": 10,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 1,
    "max_score": 0.70293105,
    "hits": [
      {
        "_index": "ecommerce",
        "_type": "product",
        "_id": "4",
        "_score": 0.70293105,
        "_source": {
          "name": "special yagao",
          "desc": "special meibai",
          "price": 50,
          "producer": "special yagao producer",
          "tags": [
            "meibai"
          ]
        }
      }
    ]
  }
}
```


如果是match，其实是or like
select * from product where name like '%yagao%' or name like '%producer%'

```json
GET /ecommerce/product/_search
{
    "query" : {
        "match" : {
            "producer" : "yagao producer"
        }
    }
}

```
##### 2.4.2.7. bool
组合多个查询条件

```json
GET /tb_item/_doc/_search
{
"query": {
    "bool": {#整体must、must_not之间用and连接，should可有可无，提高相关度罢了
        "must": { "match": {"title": "电视"}},# must里面用and连接
        "must_not": { "term": {"id": "927779"}},#must_not里面用and！连接
        "should": { "match": {"sellPoint": "好评"}}#should里面的用or连接
        }
    }
}


```

##### 2.4.2.8. fuzzy
搜索的时候，可能输入的搜索文本会出现误拼写的情况，fuzzy 搜索技术自动将拼写错误的搜索文本，进行纠正，纠正以后去尝试匹配索引中的数据

```json
GET /my_index/my_type/_search
{
  "query": {
    "fuzzy": {
      "text": {
        "value": "surprize",
        "fuzziness": 2//搜索文本最多可以纠正几个字母去跟你的数据进行匹配，默认值为 2
      }
    }
  }
}
```

```json
GET /my_index/my_type/_search
{
  "query": {
    "match": {
      "text": {
        "query": "SURPIZE ME",
        "fuzziness": "AUTO",
        "operator": "and"
      }
    }
  }
}
 
```
##### 2.4.2.9. _source
查询返回的字段

- select name, price from product

```json
GET /ecommerce/product/_search
{
  "query": {
    "match_all": {}
  },
  "_source": ["name","price"]
}
```
##### 2.4.2.10. range
范围查询

- select * from article where view_cnt between 30 and 60

```json
GET /forum/article/_search
{
  "query": {
    "constant_score": {
      "filter": {
        "range": {
          "view_cnt": {
            "gte": 30,
            "lte": 60
          }
        }
      }
    }
  }
}
```

##### 2.4.2.11. sort
排序

- select * from product where name like '%yagao%' order by price desc

```json
GET /ecommerce/product/_search
{
  "query": {
    "match": {
      "name": "yagao"
    },
  "sort": [
    {
      "price": {
        "order": "desc"
      }
    }
  ]
  }
}
```

##### 2.4.2.12. limit
分页查询
- select * from product limit 0, 1

```json
GET /ecommerce/product/_search
{
  "query": {
    "match_all": {}
  },
  "from": 1,
  "size": 1
}
```






##### 2.4.2.13. filter
跟query唯一不同的是不参与相关度评分

- select * from product where name like '%yagao%' and price >= 25

```json
GET /ecommerce/product/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "name": "yagao"
          }
        }
      ],
      "filter": {
        "range": {
          "price": {
            "gte": 25
          }
        }
      }
    }
  }
}
```

##### 2.4.2.14. highlight
高亮搜索结果
可以设置高亮 html 标签，强制使用某个highlighter，对多个字段高亮
```json
GET /ecommerce/product/_search
{
    "query" : {
        "match_phrase" : {
            "producer" : "yagao producer"
        }
    },
    "highlight": {
      "fields": {
        "producer": {}
      }
    }
}



{
  "took": 61,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 1,
    "max_score": 0.70293105,
    "hits": [
      {
        "_index": "ecommerce",
        "_type": "product",
        "_id": "4",
        "_score": 0.70293105,
        "_source": {
          "name": "special yagao",
          "desc": "special meibai",
          "price": 50,
          "producer": "special yagao producer",
          "tags": [
            "meibai"
          ]
        },
        "highlight": {
          "producer": [
            "special <em>yagao</em> <em>producer</em>"
          ]
        }
      }
    ]
  }
}
```


##### 2.4.2.15. scroll search
原理是保存当前数据的一个快照，缺点是只能一页页的往下翻，类似于微博下拉，不能随意的翻页，否则效率更慢

###### 2.4.2.15.1. 零停机重建索引
前提客户端使用的索引是一个别名
新建一个索引，把 text 字段建立成 string 类型
使用 scoll api 批量查询出来
使用 bulk api 批量插入到新索引中去
移除别名中的旧索引，把新索引与别名相关联

##### 2.4.2.16. 权重控制
可以使用boost给搜索条件设置权重，量化重要程度
默认情况下，搜索条件的权重都是一样的，都是1


```json

GET /forum/article/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "title": "blog"
          }
        }
      ],
      "should": [
        {
          "match": {
            "title": {
              "query": "java"
            }
          }
        },
        {
          "match": {
            "title": {
              "query": "hadoop"
            }
          }
        },
        {
          "match": {
            "title": {
              "query": "elasticsearch"
            }
          }
        },
        {
          "match": {
            "title": {
              "query": "spark",
              "boost": 5
            }
          }
        }
      ]
    }
  }
}
```


#### 2.4.3. 统计Document
##### 2.4.3.1. 分组

select tags, count(*) from product group by tags

首先分组的 text 字段上默认 fielddata=false, 需要设置为 true

```json
PUT /ecommerce/product/_mapping
{
  "properties": {
    "tags":{
      "type": "text",
      "fielddata": true
    }
  }
}
```

然后才能使用聚合

```json
GET /ecommerce/product/_search
{
  "aggs": {
    "group_by_tags": {
      "terms": {
        "field": "tags"
      }
    }
  }
}



{
  "took": 146,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 4,
    "max_score": 0,
    "hits": []
  },
  "aggregations": {
    "group_by_tags": {
      "doc_count_error_upper_bound": 0,
      "sum_other_doc_count": 0,
      "buckets": [
        {
          "key": "fangzhu",
          "doc_count": 2
        },
        {
          "key": "meibai",
          "doc_count": 2
        },
        {
          "key": "qingxin",
          "doc_count": 1
        }
      ]
    }
  }
}
```

##### 2.4.3.2. 查询后分组

select tags, count(*) from product where name like '%yagao%' 
group by tags

```json
GET /ecommerce/product/_search
{
  "query": {
    "match": {
      "name": "yagao"
    }
  },
  "aggs": {
    "group_by_tags": {
      "terms": {
        "field": "tags"
      }
    }
  },
  "size": 0
}
 
```

##### 2.4.3.3. 分组后计算平均值

select avg(price) from product where tags like '%tags%'
group by tags

```json
GET /ecommerce/product/_search
{
  "aggs": {
    "group_by_tags": {
      "terms": {
        "field": "tags"
      },
      "aggs": {
        "avg_by_price": {
          "avg": {
            "field": "price"
          }
        }
      }
    }
  },
  "size": 0
}



{
  "took": 3,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 4,
    "max_score": 0,
    "hits": []
  },
  "aggregations": {
    "group_by_tags": {
      "doc_count_error_upper_bound": 0,
      "sum_other_doc_count": 0,
      "buckets": [
        {
          "key": "fangzhu",
          "doc_count": 2,
          "avg_by_price": {
            "value": 27.5
          }
        },
        {
          "key": "meibai",
          "doc_count": 2,
          "avg_by_price": {
            "value": 40
          }
        },
        {
          "key": "qingxin",
          "doc_count": 1,
          "avg_by_price": {
            "value": 40
          }
        }
      ]
    }
  }
}
```

##### 2.4.3.4. 分组后排序
select avg(price) from product where tags like '%tags%'
group by tags
order by avg(price) desc
```json
GET /ecommerce/product/_search
{
  "aggs": {
    "group_by_tags": {
      "terms": {
        "field": "tags",
        "order": {
          "avg_by_price": "desc"
        }
      },
      "aggs": {
        "avg_by_price": {
          "avg": {
            "field": "price"
          }
        }
      }
    }
  },
  "size": 0
}
```

#### 2.4.4. 修改Document

##### 2.4.4.1. 全量更新

```json
PUT /ecommerce/product/1
{
    "name" : "jiaqiangban gaolujie yagao",
    "desc" :  "gaoxiao meibai",
    "price" :  30,
    "producer" :      "gaolujie producer",
    "tags": [ "meibai", "fangzhu" ]
}
```

##### 2.4.4.2. 部分更新

```json
POST /ecommerce/product/1/_update
{
  "doc": {
    "name": "jiaqiangban gaolujie yagao"
  }
}
```

###### 2.4.4.2.1. 内置乐观锁并发控制

```json
POST /test_index/test_type/11/_update?retry_on_conflict=2
{
  "doc": {
    "num" : 2
  }
}
```

retry_on_conflict是并发冲突的时候的重试次数：
- 获取 document 数据和最新版本
- 基于这个版本号与服务器的版本号对比去更新
- 失败则重试

#### 2.4.5. 批量操作

##### 2.4.5.1. 批量查询
一条一条的查询，比如说要查询 100条 数据，那么就要发送 100次 网络请求，这个开销还是很大的
如果进行批量查询的话，查询 100条 数据，就只要发送 1次 网络请求，网络请求的性能开销缩减 100倍

```json
# 不同的index
GET /_mget
{
   "docs" : [
      {
         "_index" : "test_index",
         "_type" :  "test_type",
         "_id" :    10
      },
      {
         "_index" : "test_index",
         "_type" :  "test_type",
         "_id" :    11
      }
   ]
}

# 同一个index
GET /test_index/_mget
{
   "docs" : [
      {
         "_type" :  "test_type",
         "_id" :    10
      },
      {
         "_type" :  "test_type",
         "_id" :    11
      }
   ]
}
```

##### 2.4.5.2. 批量增删改
- delete：删除一个文档，只要 1个 json 串就可以了
- create：PUT /index/type/id/_create，强制创建/存在则报错
- index：普通的put操作，可以是创建文档，也可以是全量替换文档
- update：执行的 partial update 操作

```json
POST /_bulk
{ "delete": { "_index": "test_index", "_type": "test_type", "_id": "3" }}
{ "create": { "_index": "test_index", "_type": "test_type", "_id": "12" }}
{ "test_field":    "test12" }
{ "index":  { "_index": "test_index", "_type": "test_type", "_id": "2" }}
{ "test_field":    "replaced test2" }
{ "update": { "_index": "test_index", "_type": "test_type", "_id": "1", "_retry_on_conflict" : 3} }
{ "doc" : {"test_field2" : "bulk test1"} }

```

###### 2.4.5.2.1. bulk size 最佳大小
bulk request 会加载到内存里，如果太大的话，性能反而会下降，因此需要反复尝试一个最佳的 bulk size。一般从 1000~5000 条数据开始，尝试逐渐增加。另外，如果看大小的话，最好是在 5~15MB 之间。

#### 2.4.6. 删除Document
```json
DELETE /ecommerce/product/1
```


#### 2.4.7. Document元数据

##### 2.4.7.1. _index
代表一个 document 存放在哪个 index 中

##### 2.4.7.2. _type
一个index通常会划分为多个 type
##### 2.4.7.3. _id
代表 document 的唯一标识，与 index 和 type 一起，可以唯一标识和定位一个 document

- 手动生成ID：
    
```json
PUT /test_index/test_type/1
{
  "test_content": "test test"
}
```
- 自动生成ID：
```json
POST /test_index/test_type
{
  "test_content": "test test"
}
```

    - 长度为 20 个字符
    - URL 安全：经过了 base64编码的 id，可以放在 url 中传递
    - GUID 方式，分布式系统并行生成时不可能发生冲突
##### 2.4.7.4. _source
查询时候默认返回的字段

```json
# 2. 新增
PUT /test_index/test_type/1
{
  "test_content": "test test",
  "test_content2": "test test2"
}

#查询
GET /test_index/test_type/1
{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "1",
  "_version": 2,
  "found": true,
  "_source": {//默认的_source就是我们新增的
    "test_content": "test test",
    "test_content2": "test test2"
  }
}
```

    
可以定制返回的source

```json
GET /test_index/test_type/_search
{
  "query": {
    "match": {
      "_id": "1"
    }
  },
  "_source": ["test_content","test_content2"]
}
 
```

##### 2.4.7.5. _all

将所有 field 打包在一起，作为一个 _all field，建立索引。没指定任何 field 进行搜索时，就是使用 _all field在搜索

- 这个字段是默认开启的，可以手动关闭

```json
PUT /my_index/_mapping/my_type3
{
  "_all": {"enabled": false}
}

```

- 可以在 field 级别设置 include_in_all field，设置是否要将 field 的值包含在 _all field 中

```json
PUT /my_index/_mapping/my_type4
{
  "properties": {
    "my_field": {
      "type": "text",
      "include_in_all": false
    }
  }
}

```

##### 2.4.7.6. _version
在创建的时候值为 0 ，在修改和删除的时候回自动增加 1

###### 2.4.7.6.1. 实现乐观锁解决并发更新冲突

1. 先添加一条数据,此时 version = 1

```json
PUT /test_index/test_type/7
{
  "test_field": "test test"
}
```
 

    
2. 带上 version = 1 更新数据，客户端1 更新成功

```json
PUT /test_index/test_type/7?version=1
{
  "test_field": "test client 1"
}
 
```

    
3. 带上 version = 1 更新数据

```json
PUT /test_index/test_type/7?version=1
{
  "test_field": "test client 2"
}
```


## 3. Elasticsearch和MySQL的同步
- [Elasticsearch和MySQL的同步.md](Elasticsearch和MySQL的同步.md)
## 4. 参考
- [关于ElasticSearch的Update By Query的那些著名的坑\_布道\-CSDN博客](https://blog.csdn.net/alex_xfboy/article/details/99715217)
- [ElasticSearch6\.7使用\_delete\_by\_query产生版本冲突（version conflict）问题\_学无止境，永不停歇\-CSDN博客](https://blog.csdn.net/qq_41878532/article/details/109533239)
- [Elasticsearch解决数据版本冲突问题的策略\_Stay Hungry, Stay Foolish\-CSDN博客](https://blog.csdn.net/superman_xxx/article/details/91043509)
- [Elasticsearch delete\_by\_query 409 version conflict \- Elastic Stack / Elasticsearch \- Discuss the Elastic Stack](https://discuss.elastic.co/t/elasticsearch-delete-by-query-409-version-conflict/174150)