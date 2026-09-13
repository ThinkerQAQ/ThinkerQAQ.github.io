---
title: "2.8 RateLimiter"
description: "1. 是什么 Google基于令牌桶算法实现的限流工具 2. 使用 3. 源码分析 3.1. 创建RateLimiter - RateLimiter - SmoothBursty - SmoothRateLimiter 3.2. 获取锁 - RateLimiter - SmoothRateLimit"
sourcePath: "Java/Framework/Google_Guava/RateLimiter.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 10
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2021-05-23T12:33:09Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 是什么
Google基于令牌桶算法实现的限流工具

## 2. 使用

```java
RateLimiter limiter = RateLimiter.create(10);
for (int i = 0; i < 100; i++)
{
    limiter.acquire();
    System.out.println(i + ":get lock");
}
```


## 3. 源码分析

### 3.1. 创建RateLimiter
- RateLimiter

```java
 public static RateLimiter create(double permitsPerSecond) {

    return create(SleepingStopwatch.createFromSystemTimer(), permitsPerSecond);
  }

static RateLimiter create(SleepingStopwatch stopwatch, double permitsPerSecond) {
  		//默认使用SmoothBursty（令牌生成速度恒定）
    RateLimiter rateLimiter = new SmoothBursty(stopwatch, 1.0 /* maxBurstSeconds */);
    	//设置每秒生成令牌数
    rateLimiter.setRate(permitsPerSecond);
    return rateLimiter;
  }

public final void setRate(double permitsPerSecond) {
    checkArgument(
        permitsPerSecond > 0.0 && !Double.isNaN(permitsPerSecond), "rate must be positive");
    //SmoothRateLimiter的doSetRate方法
    synchronized (mutex()) {
      doSetRate(permitsPerSecond, stopwatch.readMicros());
    }
  }
```

- SmoothBursty

```java

/**
 * 当前存储令牌数
 */
double storedPermits;

/**
 * 最大存储令牌数
 */
double maxPermits;

/**
 * 添加令牌时间间隔
 */
double stableIntervalMicros;

/**
 * 下一次请求可以获取令牌的起始时间
 * 由于RateLimiter允许预消费，上次请求预消费令牌后
 * 下次请求需要等待相应的时间到nextFreeTicketMicros时刻才可以获取令牌
 */
private long nextFreeTicketMicros = 0L;

SmoothBursty(SleepingStopwatch stopwatch, double maxBurstSeconds) {
      super(stopwatch);
      this.maxBurstSeconds = maxBurstSeconds;
    }
```

- SmoothRateLimiter
```java
final void doSetRate(double permitsPerSecond, long nowMicros) {
    resync(nowMicros);
    double stableIntervalMicros = SECONDS.toMicros(1L) / permitsPerSecond;//// 计算最大存储令牌数
    this.stableIntervalMicros = stableIntervalMicros;
    doSetRate(permitsPerSecond, stableIntervalMicros);
  }
```


### 3.2. 获取锁
- RateLimiter

```java
public double acquire() {
    	//默认获取一把锁
    return acquire(1);
  }

public double acquire(int permits) {
		long microsToWait = reserve(permits);
		//等待相应的时间
		stopwatch.sleepMicrosUninterruptibly(microsToWait);
		return 1.0 * microsToWait / SECONDS.toMicros(1L);
}

 final long reserve(int permits) {
 		//检查permits是否为正数
    checkPermits(permits);
    	//线程不安全，需要加锁
    synchronized (mutex()) {
    		//获取permits个令牌
      return reserveAndGetWaitLength(permits, stopwatch.readMicros());
    }
  }

  final long reserveAndGetWaitLength(int permits, long nowMicros) {
    	//SmoothRateLimiter的reserveEarliestAvailable方法
    long momentAvailable = reserveEarliestAvailable(permits, nowMicros);
    	//返回需要等待的时间
    return max(momentAvailable - nowMicros, 0);
  }
```

- SmoothRateLimiter
```java
final long reserveEarliestAvailable(int requiredPermits, long nowMicros) {
    	//获取令牌的时候才去生成令牌
    resync(nowMicros);
    long returnValue = nextFreeTicketMicros;// 返回的是上次计算的nextFreeTicketMicros--本次请求需要为上次请求的预消费行为埋单，这也是RateLimiter可以预消费(处理突发)的原理所在。若需要禁止预消费，则修改此处返回更新后的nextFreeTicketMicros值
    double storedPermitsToSpend = min(requiredPermits, this.storedPermits);// 可以消费的令牌数
    double freshPermits = requiredPermits - storedPermitsToSpend;// 还需要的令牌数

    long waitMicros = storedPermitsToWaitTime(this.storedPermits, storedPermitsToSpend)
        + (long) (freshPermits * stableIntervalMicros);// 根据freshPermits计算需要等待的时间

    this.nextFreeTicketMicros = nextFreeTicketMicros + waitMicros;// 本次计算的nextFreeTicketMicros不返回
    this.storedPermits -= storedPermitsToSpend;//把当前的令牌数减去需要分配出去的令牌数
    return returnValue;
  }
```

- resync
使用的是的令牌桶的算法。它会按照一定的频率往桶里扔令牌，线程拿到令牌才能执行。
那么谁来持续生成令牌往桶里放呢？
1. 开个定时任务。问题：太过耗费资源
2. 懒计算。获取令牌之前调用一个函数检查是否需要往桶里加入令牌
```java
void resync(long nowMicros) {
  // if nextFreeTicket is in the past, resync to now
	//当前时间>下次允许产生令牌的时间，此时表示可以有多的令牌可以获取
  if (nowMicros > nextFreeTicketMicros) {
  		//计算这个时间段可以产生的令牌数
	double newPermits = (nowMicros - nextFreeTicketMicros) / coolDownIntervalMicros();
		//限制最大令牌数
	storedPermits = min(maxPermits, storedPermits + newPermits);
		//将下次允许产生令牌的时间设置为当前时间nowMicros
	nextFreeTicketMicros = nowMicros;
  }
}
```


## 4. 总结

- 加锁
- 生成令牌
    - 上次生成的时间到这次的时间计算令牌数，存储令牌。最大不能超过create设置的值
- 消费令牌
    - 通过当前存储的令牌数和需要的令牌数计算还需要的令牌数，再计算等待时间并更新（下次请求需要等待这个时间）
    - 等待上次请求计算的时间



## 5. 参考
- [Guava RateLimiter源码解析 \- 林中小舍 \- SegmentFault 思否](https://segmentfault.com/a/1190000012875897)
