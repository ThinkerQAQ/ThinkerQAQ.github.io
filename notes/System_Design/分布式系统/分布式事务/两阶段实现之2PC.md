[toc]
 

## 1. 2PC是什么
- 2PC：Two-Phase Commit
- 把事务分成两个阶段
    - 第一阶段由事务管理器像所有database发送prepare请求
    - 如果全部响应ok那么执行第二阶段的commit；如果有一个响应fail那么执行第二阶段的rollback
- ![](https://raw.githubusercontent.com/TDoct/images/master/img/20200224121809.png)



## 2. 2PC存在的问题

- 单点问题：事务管理器或者任意一个资源管理器挂了，那么整个事务无法执行
- 同步阻塞：各个database第一阶段开始锁定资源，直接第二阶段释放锁资源，一直处于阻塞状态

## 3. 2PC的实现

### 3.1. XA
- DTP模型定义了- 定义了几个角色：
    - AP：我们的微服务
    - TM：全局事务管理者
    - RM：数据库
    - CRM：TM和RM的通信中间件
- 一个分布式事务可以被拆分成许多个本地事务，运行在不同的AP和RM上
- 每个本地事务的ACID很好实现，但是全局事务必须保证其中包含的每一个本地事务都能同时成功,若有一个本地事务失败,则所有其它事务都必须回滚。但问题是,本地事务处理过程中,并不知道其它事务的运行状态。因此,就需要通过CRM来通知各个本地事务,同步事务执行的状态
- 因此,各个本地事务的通信必须有统一的标准,否则不同数据库间就无法通信。XA就是TM和RM通讯的接口规范


## 4. 参考
- [再有人问你分布式事务，把这篇扔给他 \- 掘金](https://juejin.im/post/5b5a0bf9f265da0f6523913b#heading-15)
- [事务 \- 请问TCC和2PC的区别在哪里 \- SegmentFault 思否](https://segmentfault.com/q/1010000015277647)
- [请问TCC和2PC的区别在哪里？ \- 知乎](https://www.zhihu.com/question/280888550)