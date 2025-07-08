## 1. 需求
### 1.1. 业务流程
1. 用户输入一段文本，得到一个URL
2. 用户输入这个URL，可以得到原始文本
## 2. 限制条件
### 2.1. 请求量
- 读取：每个月一亿
- 写入：每个月一千万
- 读写比例接近10：1，那么可以读写分离
### 2.2. 数据量
- 每个paste对象1KB
- 一个月1KB*1000 0000=9.5G
### 2.3. 存储时间
- 一个月
## 3. 整体架构
- ![pastebin设计](https://raw.githubusercontent.com/TDoct/images/master/1627051731_20210723224754292_12965.png)
## 4. 存储
### 4.1. MySQL
```sql
shortlink char(7) NOT NULL
expiration_length_in_minutes int NOT NULL
created_at datetime NOT NULL
paste_path varchar(255) NOT NULL
PRIMARY KEY(shortlink)
```

### 4.2. Redis
- string: url:文本
## 5. 协议



### 5.1. 根据URL获取文本
- 参数：URL
- 返回：文本
- 逻辑：
    - 从Redis中根据URL查询
    - 没有则从MySQL查询，然后放入Redis
### 5.2. 上传文本获取URL
- 参数：文本
- 返回：URL
- 逻辑：
    - 上传文本到对象存储获取URL
    - Redis INCR生成ID转64进制
    - 把关系记录到Redis
    - 发Kafka消息

### 5.3. 后台消费Kafka消息
- 逻辑：
    - 收Kafka消息
    - 写入MySQL