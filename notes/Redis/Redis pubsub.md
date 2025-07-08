
## 1. Redis Pub/Sub是什么
publisher把消息丢给channel，有多个subcriber可以订阅这个channel。
类似于[消息队列介绍.md](../Message_Queue/消息队列介绍.md)的发布订阅模式，解耦了publisher和subcriber


## 2. Redis Pub/Sub使用
### 2.1. 基本使用

```redis
PUBLISH
SUBSCRIBE
UNSUBSCRIBE
```

- 订阅者1订阅channel
```redis
127.0.0.1:6379> SUBSCRIBE foo bar
Reading messages... (press Ctrl-C to quit)
1) "subscribe"
2) "foo"
3) (integer) 1
1) "subscribe"
2) "bar"
3) (integer) 2
```

- 订阅者2订阅channel

```redis
127.0.0.1:6379> SUBSCRIBE foo bar
Reading messages... (press Ctrl-C to quit)
1) "subscribe"
2) "foo"
3) (integer) 1
1) "subscribe"
2) "bar"
3) (integer) 2
```

- 发布者发布channel

```redis
127.0.0.1:6379> PUBLISH foo hahaha
(integer) 2
127.0.0.1:6379> PUBLISH bar jiejiej
(integer) 2
127.0.0.1:6379>
```

- 订阅者1、2收到消息
```redis
127.0.0.1:6379> SUBSCRIBE foo bar
Reading messages... (press Ctrl-C to quit)
1) "subscribe"
2) "foo"
3) (integer) 1
1) "subscribe"
2) "bar"
3) (integer) 2
1) "message"
2) "foo"    
3) "hahaha" 
1) "message"
2) "bar"    
3) "jiejiej"
```
- 订阅者1退出订阅
```redis
UNSUBSCRIBE foo bar
```
- 发布者发布消息只有订阅者2收到
- 订阅者3订阅channel不会收到原有的消息
```redis
127.0.0.1:6379> SUBSCRIBE foo bar
Reading messages... (press Ctrl-C to quit)
1) "subscribe"
2) "foo"
3) (integer) 1
1) "subscribe"
2) "bar"
3) (integer) 2
```
### 2.2. 模式匹配
- 语法测试：
```redis
PSUBSCRIBE news.*
PUNSUBSCRIBE news.*
```

- 如果订阅者用基本格式和模式匹配订阅了一个频道，那么会收到后重复的消息
```redis
SUBSCRIBE foo
PSUBSCRIBE f*
```

## 3. 参考
- [Pub/Sub – Redis](https://redis.io/topics/pubsub)