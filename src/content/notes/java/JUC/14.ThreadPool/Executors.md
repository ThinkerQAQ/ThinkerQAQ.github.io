---
title: "6.28 Executors"
description: "1. 使用 2. newCachedThreadPool 3. newScheduledThreadPool 4. newFixedThreadPool 5. newSingleThreadExecutor"
sourcePath: "Java/JUC/14.ThreadPool/Executors.md"
category: "java"
categoryLabel: "Java"
topic: "JUC"
topicLabel: "6.JUC"
order: 178
tags: ["Java"]
createdAt: "2020-02-08T14:35:22Z"
updatedAt: "2020-02-08T14:41:28Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 使用

```java
public class TestExecutors
{
    public static void main(String[] args)
    {
        Executors.newCachedThreadPool();
        Executors.newScheduledThreadPool(10, Executors.defaultThreadFactory());
        Executors.newFixedThreadPool(10);
        Executors.newSingleThreadExecutor();

    }
}
```

## 2. newCachedThreadPool
```java
    public static ExecutorService newCachedThreadPool() {
        return new ThreadPoolExecutor(0, Integer.MAX_VALUE,//最大线程数有问题
                                      60L, TimeUnit.SECONDS,
                                      new SynchronousQueue<Runnable>());
    }
```
## 3. newScheduledThreadPool
```java
public static ScheduledExecutorService newScheduledThreadPool(
    int corePoolSize, ThreadFactory threadFactory) {
return new ScheduledThreadPoolExecutor(corePoolSize, threadFactory);
}

public ScheduledThreadPoolExecutor(int corePoolSize,
                                   ThreadFactory threadFactory) {
   //最大线程数有问题
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), threadFactory);
}
```
## 4. newFixedThreadPool
```java
    public static ExecutorService newFixedThreadPool(int nThreads) {
        return new ThreadPoolExecutor(nThreads, nThreads,
                                      0L, TimeUnit.MILLISECONDS,
                                      new LinkedBlockingQueue<Runnable>());//使用的LinkedBlockingQueue无界
    }
```



## 5. newSingleThreadExecutor

```java
public static ExecutorService newSingleThreadExecutor() {
    return new FinalizableDelegatedExecutorService
        (new ThreadPoolExecutor(1, 1,
                                0L, TimeUnit.MILLISECONDS,
                                new LinkedBlockingQueue<Runnable>()));//使用的LinkedBlockingQueue无界
}
```
