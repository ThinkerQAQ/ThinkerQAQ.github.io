## 1. 什么是big key
- 针对value来说
    - string类型：一般认为超过10KB
    - 其他类型：元素个数过多

## 2. big key的危害

- 超时阻塞：操作big key比较耗时
- 内存空间分配不均匀：比如redis cluster模式之下
- 大key读写瓶颈在CPU还是带宽？带宽在xx以下，带宽先满，超过xx后CPU先满
## 3. 如何发现big key
- scan+debug object：在从节点上，使用scan命令渐进扫描，然后使用debug object计算每个key的serializedlength属性是否过大
- redis-cli自带--bigkeys，例如：redis-cli -h <hostip> -a <password> --bigkeys


## 4. 如何删除big key
- string：使用del
- 其他：hcan+hdel+del
## 5. 如何解决big key
### 5.1. 拆分成小key

## 6. 参考
- [A Detailed Explanation of the Detection and Processing of BigKey and HotKey in Redis \- Alibaba Cloud Community](https://www.alibabacloud.com/blog/a-detailed-explanation-of-the-detection-and-processing-of-bigkey-and-hotkey-in-redis_598143)
- [如何处理redis集群的hot key和big key \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1673139)
- [云数据库 Redis 查询实例大Key\-API 文档\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/239/38922)
- [发现并处理Redis的大Key和热Key](https://help.aliyun.com/document_detail/353223.html)