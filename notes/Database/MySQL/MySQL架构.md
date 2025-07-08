## 1. MySQL逻辑架构图
- ![MySQL逻辑架构](https://raw.githubusercontent.com/TDoct/images/master/1626576661_20210717234718525_26845.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620138274_20210504222430738_20268.png)
1. 客户端请求服务器
2. 服务器的连接管理器负责处理连接
3. 服务器的查询优化器负责处理SQL
    -  一条查询语句进行语法解析之后就会被交给查询优化器来进行优化，优化的结果就是生成一个所谓的 执行计划 
    - 这个执行计划表明了应该使用哪些索引进行查询，表之间的连接顺序是啥样的
4. 最后会按照行计划中的步骤调用存储引擎提供的方法来真正的执行查询，并将查询结果返回给用户
## 2. MySQL组件
### 2.1. Server层
- 负责MySQL功能相关的组件
#### 2.1.1. 连接器
- [MySQL连接器.md](MySQL连接器.md)
#### 2.1.2. 分析器
- [MySQL分析器.md](MySQL分析器.md)
#### 2.1.3. 优化器
- [MySQL查询优化器.md](MySQL查询优化器.md)
#### 2.1.4. 执行器
- [MySQL执行器.md](MySQL执行器.md)
### 2.2. 存储引擎
- [MySQL存储引擎.md](MySQL存储引擎.md)

## 3. 参考
- [万字总结：学习MySQL优化原理，这一篇就够了！ \- SQL优化 \- dbaplus社群：围绕Data、Blockchain、AiOps的企业级专业社群。技术大咖、原创干货，每天精品原创文章推送，每周线上技术分享，每月线下技术沙龙。](https://dbaplus.cn/news-155-1531-1.html)
- [mysql逻辑架构介绍](https://juejin.cn/post/6844904165274025992)