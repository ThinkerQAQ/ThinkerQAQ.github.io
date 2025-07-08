[toc]
 


## 1. TCC是什么
保证最终一致性的一种分布式事务方案

## 2. TCC流程
- TCC：Try、 Confirm、 Cancel
- 把事务分成两个阶段
    - 第一阶段执行Try操作，对业务检查及资源预留
    - 第二阶段根据第一阶段的结果决定。
        - 如果第一阶段成功则执行Conﬁrm 做业务确认操作；
        - 如果第一阶段失败则执行Cancel（实现一个与 Try 相反的操作，类似于人工回滚）
    - ![TCC](https://raw.githubusercontent.com/TDoct/images/master/1622647861_20210602233054622_16384.png)
## 3. 2PC vs TCC
- 跟2PC比较非常相似，都是两个阶段
    - 2PC是数据库层面的两阶段，而TCC是应用层面的两阶段
    - TCC的每个Try、Confirm、Cancel各自在一个单独的事务中；而2PC则是在一个事务中
- TCC解决了2PC几个缺点
    - 性能问题：阶段1只是检查并预留资源，不需要加锁至阶段2
    - 单点问题：阶段1完成之后，在阶段2如果业务活动管理器挂了那么还有其他的业务活动管理器
    - 一致性问题：阶段1完成之后，在阶段2如果任一参与者挂了没有返回ACK，那么一直重试直至成功（因为阶段1已经预留了资源可以保证成功）
## 4. TCC的问题

- 侵入性高：依赖于业务方来配合提供ry, confirm, cancel 三个接口
## 5. TCC的使用场景
- 适用于强一致性、实时性要求高、分布式事务可以回滚的业务的处理结果，比如互联网金融企业最核心的三个服务：交易、支付、账务
- 多个服务使用多个数据源且数据源可以不是DB

## 6. TCC的实现
### 6.1. Seata的TCC模式

- 不依赖于底层数据资源的事务支持：
    - 一阶段 prepare 行为：调用 自定义 的 prepare 逻辑。
    - 二阶段 commit 行为：调用 自定义 的 commit 逻辑。
    - 二阶段 rollback 行为：调用 自定义 的 rollback 逻辑。
### 6.2. Seata的AT模式

- 基于 支持本地 ACID 事务 的 关系型数据库
- Java 应用，通过 JDBC 访问数据库。
- Seata的AT模式第二阶段根本不需要我们编写，全部有Seata自己实现了

## 7. 参考
- [再有人问你分布式事务，把这篇扔给他 \- 掘金](https://juejin.im/post/5b5a0bf9f265da0f6523913b#heading-15)
- [事务 \- 请问TCC和2PC的区别在哪里 \- SegmentFault 思否](https://segmentfault.com/q/1010000015277647)
- [请问TCC和2PC的区别在哪里？ \- 知乎](https://www.zhihu.com/question/280888550)
- [Seata Tcc 模式](http://seata.io/zh-cn/docs/dev/mode/tcc-mode.html)
- [Seata AT 模式](http://seata.io/zh-cn/docs/dev/mode/at-mode.html)