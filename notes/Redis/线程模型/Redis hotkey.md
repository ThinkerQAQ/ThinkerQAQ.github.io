## 1. 什么是Redis hot key
某个key读写QPS超过了Redis单机QPS瓶颈，并且由于是一个key，无法用Redis Cluster分担压力


## 2. 如何发现Redis hot key
- 业务服务metrics打点统计上报
- Redis proxy收集信息

每秒访问超过1W次的算作热key
## 3. 如何解决Redis hot key
### 3.1. 复制key
key后缀加上一个随机数，分布到不同Redis实例上，一般使用read-through缓存。

```go
//redis 实例数
const M = 16

//redis 实例数倍数（按需设计，2^n倍，n一般为1到4的整数）
const N = 2

func main() {
//获取 redis 实例 
    c, err := redis.Dial("tcp", "127.0.0.1:6379")
    if err != nil {
        fmt.Println("Connect to redis error", err)
        return
    }
    defer c.Close()

    hotKey := "hotKey:abc"
    //随机数
    randNum := GenerateRangeNum(1, N*M)
    //得到对 hot key 进行打散的 key
    tmpHotKey := hotKey + "_" + strconv.Itoa(randNum)

    //hot key 过期时间
    expireTime := 50

    //过期时间平缓化的一个时间随机值
    randExpireTime := GenerateRangeNum(0, 5)

    data, err := redis.String(c.Do("GET", tmpHotKey))
    if err != nil {
        data, err = redis.String(c.Do("GET", hotKey))
        if err != nil {
            data = GetDataFromDb()
            c.Do("SET", "hotKey", data, expireTime)
            c.Do("SET", tmpHotKey, data, expireTime + randExpireTime)
        } else {
            c.Do("SET", tmpHotKey, data, expireTime + randExpireTime)
        }
    }
}
```

本质上就是复制，只能解决读的性能问题，不能解决写的问题，而且可读性差
### 3.2. 本地缓存
每个机器都复制了一份Redis的hot key，负载均衡
本质上也是复制，可以解决读的问题，也可以解决写的问题（配合一致性Hash路由到同一个节点）
## 4. 参考
- [高频面试题\-redis热key解决方案\_哔哩哔哩\_bilibili](https://www.bilibili.com/video/BV1rF411u74w?spm_id_from=333.999.0.0)
- [谈谈redis的热key问题如何解决 \- 脉脉](https://maimai.cn/article/detail?fid=1381258970&efid=-wJf9k3D3iGJ1ssJiqjokw)
- [有赞透明多级缓存解决方案（TMC）](https://tech.youzan.com/tmc/)
- [A Detailed Explanation of the Detection and Processing of BigKey and HotKey in Redis \- Alibaba Cloud Community](https://www.alibabacloud.com/blog/a-detailed-explanation-of-the-detection-and-processing-of-bigkey-and-hotkey-in-redis_598143)
- [如何处理redis集群的hot key和big key \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1673139)
- [云数据库 Redis 查询实例热Key\-API 文档\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/239/38920)
- [云数据库 Redis 热 Key 分析\-操作指南\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/239/73560)
- [云数据库 Redis 5秒监控更新说明\-操作指南\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/239/48573)
- [云监控 告警服务\-快速入门\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/248/42449)
