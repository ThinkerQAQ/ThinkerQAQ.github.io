## 1. Saga是什么
保证最终一致性的一种分布式事务方案

## 2. Saga流程
- 有多个事务参与者，每个参与者都有两块逻辑：正向操作和逆向操作
- 把事务分成两个阶段
    - 第一阶段每个参与者执行正向操作
    - 第二阶段根据第一阶段结果而定
        - 如果所有正向操作均执行成功，那么分布式事务提交
        - 如果任何一个正向操作执行失败，退回去执行前面各参与者的逆向操作
- ![](https://img.alicdn.com/tfs/TB1Y2kuw7T2gK0jSZFkXXcIQFXa-445-444.png)
## 3. TCC vs Saga
- 相同点：
    - 都是两个阶段
    - 都需要实现补偿操作
- 不同点：
    - TCC是同步的，而Saga是异步的(由事件驱动)
    - TCC第一阶段需要预留资源，而Saga不需要


## 4. Saga的使用场景
- 多个服务使用多个数据源且每个数据源可以是不同的
- 参与者包含其它公司或遗留系统服务，无法提供 TCC 模式要求的三个接口
- 业务流程长、业务流程多
## 5. Saga的问题
不保证隔离性

## 6. Saga实现
### 6.1. Seata的Saga模式
## 7. 参考
- [Seata Saga 模式](http://seata.io/zh-cn/docs/user/saga.html)
- [Saga distributed transactions \- Azure Design Patterns \| Microsoft Docs](https://docs.microsoft.com/en-au/azure/architecture/reference-architectures/saga/saga)
- [浅谈Saga分布式事务 \- SegmentFault 思否](https://segmentfault.com/a/1190000038156562)