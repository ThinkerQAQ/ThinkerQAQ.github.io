[toc]

## 1. Zookeeper分布式锁实现
### 1.1. 基于Apache Curator

- maven
```xml
<dependency>
    <groupId>org.apache.curator</groupId>
    <artifactId>curator-recipes</artifactId>
    <version>4.0.0</version>
</dependency>
```

- 例子
```java
public static void main(String[] args) throws Exception {
    //创建zookeeper的客户端
    RetryPolicy retryPolicy = new ExponentialBackoffRetry(1000, 3);
    CuratorFramework client = CuratorFrameworkFactory.newClient("10.21.41.181:2181,10.21.42.47:2181,10.21.49.252:2181", retryPolicy);
    client.start();

    //创建分布式锁, 锁空间的根节点路径为/curator/lock
    InterProcessMutex mutex = new InterProcessMutex(client, "/curator/lock");
    mutex.acquire();
    //获得了锁, 进行业务流程
    System.out.println("Enter mutex");
    //完成业务流程, 释放锁
    mutex.release();
    
    //关闭客户端
    client.close();
}
```


#### 1.1.1. 注意点
只有同一个线程的同一个InterProcessSemaphoreMutex实例才能加锁解锁 说明如下

1. 同一个线程创建两个实例, 两个都加锁 

```java
InterProcessMutex mutex = new InterProcessMutex(client, "/curator/lock");
mutex.acquire();

//可以创建成功，加锁阻塞
//原因在于创建的是有序的子节点2,等待子节点1释放

InterProcessMutex mutex2 = new InterProcessMutex(client, "/curator/lock");
mutex2.acquire();
```


2. 同一个线程创建两个实例，一个加锁，一个解锁

```java
InterProcessMutex mutex = new InterProcessMutex(client, "/curator/lock");
mutex.acquire();

InterProcessMutex mutex2 = new InterProcessMutex(client, "/curator/lock");
//抛出异常，不是持有锁的线程。（原因在于当前持有锁的节点是1而不是2）
mutex2.release();
```
3. 新开一个线程释放锁

```java
InterProcessMutex mutex = new InterProcessMutex(client, "/curator/lock");
mutex.acquire();

new Thread(()->{
	mutex.release();//抛出异常，不是持有锁的线程。（原因在于这个线程没有关联的锁数据）
}).start();
```

4. 可重入

```java
InterProcessMutex mutex = new InterProcessMutex(client, "/curator/lock");
mutex.acquire();//可重复获取
mutex.acquire();

//加了几次就要释放几次
mutex.release();
mutex.release();
```

### 1.2. 基于原生Zookeeper

#### 1.2.1. pom.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.zsk</groupId>
    <artifactId>test_zk</artifactId>
    <version>1.0-SNAPSHOT</version>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>1.5.20.RELEASE</version>
    </parent>

    <dependencies>
        <!--zookeeper-->
        <dependency>
            <groupId>org.apache.zookeeper</groupId>
            <artifactId>zookeeper</artifactId>
            <version>3.5.6</version>
        </dependency>
        <!--test-->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <version>1.5.20.RELEASE</version>
                <configuration>
                    <executable>true</executable>
                </configuration>
            </plugin>
        </plugins>
    </build>

</project>
```

#### 1.2.2. 代码
```java
public class DistributedLock
{
    private static final String LOCK_PATH = "/lock/";
    private String machineName;

    public DistributedLock(String machineName)
    {
        this.machineName = machineName;
    }

    public static void main(String[] args) throws Exception
    {
        String orderId = "1";
        IntStream.rangeClosed(1, 5)//数字序列
                .mapToObj(index -> "机器" + index)//转换：前面加上“机器”
                .map(DistributedLock::new)//转换：DistributedLock构造函数
                .map(lock -> (Runnable) () -> {//转换：创建Runnable

                    ZooKeeper zookeeper = null;
                    try
                    {
                        zookeeper = lock.connect();

                        lock.lock(zookeeper, LOCK_PATH + orderId);
                        TimeUnit.SECONDS.sleep(3);//模拟业务操作
                    }
                    catch (Exception e)
                    {
                        e.printStackTrace();
                    }
                    finally
                    {
                        lock.unlock(zookeeper, LOCK_PATH + orderId);
                    }
                }).map(Thread::new)//转换：创建Thread
                .forEach(Thread::start);//遍历启动

        TimeUnit.SECONDS.sleep(1000);
    }

    public ZooKeeper connect() throws Exception
    {
        //异步执行，使用CountDownLatch来同步，等创建连接之后再往下执行
        CountDownLatch countDownLatch = new CountDownLatch(1);
        ZooKeeper zooKeeper = new ZooKeeper("127.0.0.1:2181", 5000, new Watcher()
        {
            @Override
            public void process(WatchedEvent watchedEvent)
            {
                countDownLatch.countDown();
            }
        });
        countDownLatch.await();
        System.out.println(machineName + "Zookeeper建立连接成功");
        return zooKeeper;
    }

    public void lock(ZooKeeper zooKeeper, String lock)
    {
        zooKeeper.create(lock, "".getBytes(), ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL_SEQUENTIAL, new AsyncCallback.StringCallback()
        {
            @Override
            public void processResult(int rc, String path, Object ctx, String name)
            {
                if (rc == KeeperException.Code.OK.intValue())
                {
                    System.out.println(machineName + "获取锁成功");
                    //检查是否最小的节点，是的话获取锁成功
                    //否则监听小一号的节点，有数据变化后再次检查是否最小的节点
                }
            }
        }, "ctx_data");
    }

    public void unlock(ZooKeeper zooKeeper, String lock)
    {
        //删除节点
    }

}
```


## 2. Zookeeper分布式锁原理
创建临时有序节点+监听比自己小一号的节点删除事件
![zookeeper使用场景-分布式锁](https://raw.githubusercontent.com/TDoct/images/master/1645427704_20220221151451004_1457.png)
1. 客户端连接zookeeper，并在/lock下创建临时的且有序的子节点，第一个客户端对应的子节点为/lock/lock-0000000000，第二个为/lock/lock-0000000001，以此类推。
2. 客户端获取/lock下的子节点列表，判断自己创建的子节点是否为当前子节点列表中序号最小的子节点，如果是则认为获得锁，否则监听/lock的子节点变更消息，获得子节点变更通知后重复此步骤直至获得锁；
3. 执行业务代码；
4. 完成业务流程后，删除对应的子节点释放锁。

### 2.1. 为什么需要临时节点？
防止当机后无法释放锁
### 2.2. 为什么需要有序节点
最小的节点获取锁
### 2.3. 如何防止羊群效应
锁释放时会唤醒所有客户端，其实只要唤醒序号在自己之前的客户端即可
1. 客户端连接zookeeper，并在/lock下创建临时的且有序的子节点，第一个客户端对应的子节点为/lock/lock-0000000000，第二个为/lock/lock-0000000001，以此类推。
2. 客户端获取/lock下的子节点列表，判断自己创建的子节点是否为当前子节点列表中序号最小的子节点，如果是则认为获得锁，否则监听刚好在自己之前一位的子节点删除消息，获得子节点变更通知后重复此步骤直至获得锁；
3. 执行业务代码；
4. 完成业务流程后，删除对应的子节点释放锁。


## 3. Zookeeper分布式锁问题
### 3.1. 性能问题
- Zookeeper QPS不高，高并发场景下不够看
### 3.2. Full GC问题
- Zookeeper是基于Java实现的，如果发生Full GC导致和客户端心跳无法持续而长连接断开，那么锁旧释放了


## 4. 参考
- [基于Zookeeper的分布式锁 – Dengshenyu – Code and Coffee](http://www.dengshenyu.com/zookeeper-distributed-lock/)

