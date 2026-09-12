---
title: "18.1 Kernel_level_thread"
description: "1. 是什么 User level thread是操作系统感知不到的，由应用程序自己创建的线程并负责调度 Kernel level thread是操作系统能感知到的，并由操作系统负责调度 2. 如何验证Java线程是kernel级别的 Kernel level thread. Java程序通过JVM"
sourcePath: "Java/JUC/Thread/Kernel_level_thread.md"
category: "java-juc"
categoryLabel: "Java / JUC"
topic: "Thread"
topicLabel: "18.Thread"
order: 31
tags: ["Java","JUC"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-02-11T12:45:46Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



 

## 1. 是什么

User level thread是操作系统感知不到的，由应用程序自己创建的线程并负责调度
Kernel level thread是操作系统能感知到的，并由操作系统负责调度

## 2. 如何验证Java线程是kernel级别的

Kernel level thread.
Java程序通过JVM调用系统库创建内核线程，Java线程和内核线程是1：1的关系
证明如下：
```java
public class KernelLevelThread
{
    public static void main(String[] args) throws InterruptedException
    {
        CountDownLatch latch = new CountDownLatch(500);
        for (int i = 0; i < 500; i++)
        {
            new Thread(()->{
                try
                {
                    TimeUnit.SECONDS.sleep(10L);
                    latch.countDown();
                }
                catch (InterruptedException e)
                {
                    e.printStackTrace();
                }
            }).start();
        }

        latch.await();
    }
}

```
### 2.1. 运行前
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200103231429.png)
### 2.2. 运行后
线程数明显增加，说明操作系统感知到了，所以是kernel level thread

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200103231509.png)

