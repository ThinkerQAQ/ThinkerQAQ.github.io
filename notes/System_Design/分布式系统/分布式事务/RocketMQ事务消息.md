[toc]
 

## 1. RocketMQ事务消息是什么
- 传统的本地消息表需要依赖数据库的消息表
- 而RocketMQ事务则是对本地消息表的一个封装，将本地消息表移动到了MQ内部，解决 Producer 端的消息发送与本地事务执行的原子性问题

## 2. RocketMQ事务消息原理
![](https://raw.githubusercontent.com/TDoct/images/master/1621654322_20210522113159037_25489.png)


1. 服务A发送half message到MQ
2. 服务A收到MQ对half message的确认消息
3. 服务A执行本地事务
4. 服务A根据本地事务的执行结果发送commit/rollbak message给MQ
5. 如果第2步的确认消息丢失或者第3步的本地事务执行超时，MQ会再次发送half message的确认消息给服务A
6. 服务A检查本地事务状态
7. 服务A根据本地事务状态发送commit/rollbak message给MQ
8. MQ收到commit消息会发送消息给服务B，如果收到的是rollback消息那么丢弃




## 3. 参考
- [再有人问你分布式事务，把这篇扔给他 \- 掘金](https://juejin.im/post/5b5a0bf9f265da0f6523913b)
- [Transaction example \- Apache RocketMQ](https://rocketmq.apache.org/docs/transaction-example/)
- [The Design Of Transactional Message \- Apache RocketMQ](https://rocketmq.apache.org/rocketmq/the-design-of-transactional-message/)