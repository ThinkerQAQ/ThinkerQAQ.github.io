## 1. 定时同步
定时任务，分页拉取MySQL中的数据写入ElasticSearch
增改的数据好说，直接重新索引
但是删除的数据咋整？增加一个额外的字段update_time，更新完后对于<update_time的全部删除
## 2. cannel
通过cannel解析MySQL binlog，然后发送到Kafka
ElasticSearch消费Kafka，对于增改的消息直接重新索引，对于删除的消息则删除
## 3. kafka-connect

## 4. databus

## 5. 参考
- [cannel-脉脉](https://maimai.cn/web/gossip_detail?gid=28701944&egid=c4cbf01b82cf11ebb009e4434b3cb1b0)
- [kafka-connect-脉脉](https://maimai.cn/web/gossip_detail?gid=28651628&egid=1582ae3577e411eb98af801844e2d86c)
- [databus-脉脉](https://maimai.cn/web/gossip_detail?gid=28958400&egid=640d0d55b0aa11eb8ab1246e96b48088)