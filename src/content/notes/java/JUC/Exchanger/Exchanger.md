---
title: "6.18 Exchanger"
description: "1. 是什么 用于两个线程之间交换数据，数据的流向是双向的。即如果有Thread1和Thread2两个线程，Thread1传给Thread2一个数据 ，Thread2同时也会传给Thread1一个数据。 1.1. Exchanger对比SychronousQueue Exchanger Sychro"
sourcePath: "Java/JUC/Exchanger/Exchanger.md"
category: "java"
categoryLabel: "Java"
topic: "JUC"
topicLabel: "6.JUC"
order: 168
tags: ["Java"]
createdAt: "2020-01-23T08:00:42Z"
updatedAt: "2020-02-17T12:24:25Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. 是什么

用于两个线程之间交换数据，数据的流向是双向的。即如果有Thread1和Thread2两个线程，Thread1传给Thread2一个数据
，Thread2同时也会传给Thread1一个数据。

### 1.1. Exchanger对比SychronousQueue
|         | Exchanger | SychronousQueue |
| ------- | --------- | --------------- |
| 数据流向 | 双向      | 单向                |


![](https://raw.githubusercontent.com/TDoct/images/master/img/20200123161051.png)
## 2. 使用
```java
public class ExchangerTest
{
    private static Exchanger<String> exchanger = new Exchanger();

    public static void main(String[] args) throws InterruptedException
    {
        Thread pingThread = new Thread(() -> {
            try
            {
                String exchange = exchanger.exchange("有人在么？");
                System.out.println(Thread.currentThread().getName() + "收到消息：" + exchange);
            }
            catch (InterruptedException e)
            {
                e.printStackTrace();
            }
        }, "pingThread");

        Thread pongThread = new Thread(() -> {
            try
            {
                TimeUnit.SECONDS.sleep(3);
                String exchange = exchanger.exchange("我在");
                System.out.println(Thread.currentThread().getName() + "收到消息：" + exchange);
            }
            catch (InterruptedException e)
            {
                e.printStackTrace();
            }
        }, "pongThread");


        pingThread.start();
        pongThread.start();

        pingThread.join();
        pongThread.join();
    }

}
```

## 3. 原理分析

### 3.1. 构造方法
