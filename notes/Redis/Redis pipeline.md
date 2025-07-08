## 1. Redis pipeline是什么
- Redis的使用CS模型的，实现request/response协议的TCP服务器：
    - 客户端向服务器发送查询，并通常以阻塞的方式从套接字中读取服务器的响应。
    - 服务器处理命令并将响应发送回客户端。
- 一次RTT（往返时间）大致250ms，即使服务器每秒能处理10W个请求，现在每秒最多也就处理四个请求。换句话说时间都用在了网络IO上
- pipeline就是客户端将多个命令发送到服务器，不需要等待答复，最后一步再读取答复

## 2. 为什么需要Redis pipeline
pipeline可以减少网络IO次数

|        |      传统      |    pipeline    |
| ------ | -------------- | -------------- |
| 时间   | n次网络+n次命令 | 1次网络+n次命令 |
| 数据量 | n条命令         | n条命令         |

## 3. Redis pipeline使用
### 3.1. 批量插入大量数据

1. 准备一个文本文件
```txt
SET Key0 Value0
SET Key1 Value1
SET KeyN ValueN
```
2. `cat data.txt | redis-cli --pipe`
```redis
cat data.txt | redis-cli --pipe
```
3. 服务器上查看
### 3.2. Lua配合pipeline

```go
var seckilGoodsScriptHash atomic.String
var lock sync.Mutex

// BatchInitSeckillGoodsParticipant 批量初始化商品的秒杀人数
func (p *ActivitySeckillCardDao) BatchInitSeckillGoodsParticipant(ctx context.Context,
	expireTs int64, incrSeckills ...*model.IncrSeckillParticipant) error {
	scriptHash, err := p.getSeckilGoodsScriptHash(ctx)
	if err != nil {
		return err
	}

	pipeline, err := p.redisProxy.Pipeline(ctx)
	if err != nil {
		metrics.Counter("redis-[BatchInitSeckillGoodsParticipant]获取Pipeline失败").Incr()
		log.ErrorContextf(ctx,
			"BatchInitSeckillGoodsParticipant: redis get pipeline failed. err=%v",
			err)
		return err
	}
	defer pipeline.Close()

	for _, incrSeckill := range incrSeckills {
		args := make([]interface{}, 0)
		activityKey := seckillParticipantsKey(incrSeckill.CardId,
			incrSeckill.ActivityId)
		goodsKey := seckillGoodsParticipantsKey(incrSeckill.ActivityGoodsId)
		args = append(args, scriptHash, 1, activityKey, goodsKey,
			incrSeckill.InitParticipants, expireTs)
		if err := pipeline.Send("EVALSHA", args...); err != nil {
			metrics.Counter("redis-[BatchInitSeckillGoodsParticipant]Send缓存区失败").Incr()
			log.ErrorContextf(ctx,
				"BatchInitSeckillGoodsParticipant: redis send buffer failed. err=%v",
				err)
			return err
		}
	}
	if err := pipeline.Flush(); err != nil {
		metrics.Counter("redis-[BatchInitSeckillGoodsParticipant]Flush失败").Incr()
		log.ErrorContextf(ctx,
			"BatchInitSeckillGoodsParticipant: redis flush to server failed. err=%v",
			err)
		return err
	}
	reply, err := pipeline.Receive()
	log.DebugContextf(ctx, "BatchInitSeckillGoodsParticipant: req=%v, rsp=%v",
		incrSeckills, reply)

	if err != nil {
		metrics.Counter("redis-[BatchInitSeckillGoodsParticipant]Receive失败").Incr()
		log.ErrorContextf(ctx,
			"BatchInitSeckillGoodsParticipant: redis receive server reply failed. err=%v",
			err)
		return err
	}
	return nil
}

// 获取Lua脚本hash
func (p *ActivitySeckillCardDao) getSeckilGoodsScriptHash(ctx context.Context) (string,
	error) {
	hash := seckilGoodsScriptHash.Load()
	if hash != "" {
		return hash, nil
	}

	lock.Lock()
	defer lock.Unlock()
	hash = seckilGoodsScriptHash.Load()
	if hash != "" {
		return hash, nil
	}
	script := redis.NewScript(1, initSeckillGoodsParticipant)
	if err := script.Load(ctx, p.redisProxy); err != nil {
		metrics.Counter("redis-[BatchInitSeckillGoodsParticipant]加载Script失败").Incr()
		log.ErrorContextf(ctx,
			"BatchInitSeckillGoodsParticipant: redis load script failed. err=%v",
			err)
		return "", err
	}

	seckilGoodsScriptHash.Store(script.Hash())
	return seckilGoodsScriptHash.Load(), nil
}
 

```
## 4. Redis pipeline实现
当客户端使用流水线发送命令时，服务器将被迫使用内存将答复排队。
因此，如果需要使用流水线发送大量命令，最好分批发送
## 5. pipeline vs m命令 vs Lua脚本 vs 事务

|           | M操作 | pipeline | Lua脚本 | 事务 |
| --------- | ----- | -------- | ------- | ---- |
| 是否原子   | 是    | 否       | 是      | 是   |
| reply数目 | 1    | n        | 1      | 1    |

## 6. 参考
- [Using pipelining to speedup Redis queries – Redis](https://redis.io/topics/pipelining)
- [Redis Mass Insertion – Redis](https://redis.io/topics/mass-insert)