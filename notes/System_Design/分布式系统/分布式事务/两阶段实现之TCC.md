[toc]
 


## 1. TCC是什么
- 2PC是数据库层面的两阶段，而TCC是应用层面的两阶段
- TCC：
    - Try：尝试执行事务
    - Confirm：确认执行事务
    - Cancel：取消执行事务
- 本质上也是属于两阶段事务。
    - 第一阶段执行Try操作，对业务检查及资源预留
    - 第二阶段根据第一阶段的结果决定。成功则执行Conﬁrm 做业务确认操作，失败则执行Cancel 实现一个与 Try 相反的操作（类似于人工回滚）
- ![](https://raw.githubusercontent.com/TDoct/images/master/img/20200224125112.png)






## 2. 为什么需要TCC

- TCC解决了2PC几个缺点:
    - 单点问题：业务活动管理器变成多点
    - 同步阻塞：try的时候直接提交，不需要阻塞等待；cancel的

## 3. TCC存在的问题
- 代码侵入：需要人为编写代码实现try、confirm、cancel
## 4. 实现
### 4.1. Seata
- [seata/seata: Seata is an easy-to-use, high-performance, open source distributed transaction solution.](https://github.com/seata/seata)




## 5. 参考
- [再有人问你分布式事务，把这篇扔给他 \- 掘金](https://juejin.im/post/5b5a0bf9f265da0f6523913b#heading-15)
- [事务 \- 请问TCC和2PC的区别在哪里 \- SegmentFault 思否](https://segmentfault.com/q/1010000015277647)
- [请问TCC和2PC的区别在哪里？ \- 知乎](https://www.zhihu.com/question/280888550)