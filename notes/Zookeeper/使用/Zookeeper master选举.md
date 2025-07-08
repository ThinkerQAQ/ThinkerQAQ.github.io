


## 1. Zookeeper master选举实现

### 1.1. pom.xml

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

### 1.2. 代码

```java

public class MasterElection
{
    private static final String MATER_PATH = "/master/election";
    private String machineName;

    public MasterElection(String machineName)
    {
        this.machineName = machineName;
    }

    public static void main(String[] args) throws InterruptedException
    {
        IntStream.rangeClosed(1,5)//数字序列
                .mapToObj(index->"机器" + index)//转换：前面加上“机器”
                .map(MasterElection::new)//转换：MasterElection构造函数
                .map(task->(Runnable)()-> {//转换：创建Runnable
                    try
                    {
                        task.go();
                    }
                    catch (Exception e)
                    {
                        e.printStackTrace();
                    }
                })
                .map(Thread::new)//转换：创建Thread
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

    public void go() throws Exception
    {
        //异步执行，使用CountDownLatch来同步，等创建连接之后再往下执行
        ZooKeeper zooKeeper = connect();
        toBeMaster(zooKeeper);

    }



    private void toBeMaster(ZooKeeper zooKeeper)
    {
        zooKeeper.create(MATER_PATH, "".getBytes(), ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL, new AsyncCallback.StringCallback()
        {
            @Override
            public void processResult(int rc, String path, Object ctx, String name)
            {
                if (rc == KeeperException.Code.OK.intValue())
                {
                    System.out.println(machineName + "创建节点成功，成为master");
                    try
                    {
                        //模拟业务执行
                        TimeUnit.SECONDS.sleep(2);
                        //模拟宕机
                        zooKeeper.delete(MATER_PATH, -1);
                        System.out.println(machineName + "宕机");
                    }
                    catch (Exception e)
                    {
                        e.printStackTrace();
                    }
                }
                else if (rc == KeeperException.Code.NODEEXISTS.intValue())
                {
                    System.out.println(machineName + "等待");
                    try
                    {
                        zooKeeper.exists(MATER_PATH, new Watcher()
                        {
                            @Override
                            public void process(WatchedEvent event)
                            {
                                if (event.getType() == Event.EventType.NodeDeleted)
                                {
                                    toBeMaster(zooKeeper);
                                }
                            }
                        });
                    }
                    catch (Exception e)
                    {
                        e.printStackTrace();
                    }
                }
                else
                {
                    System.out.println(machineName + "异常状态");
                }
            }
        }, "ctx_data");
    }
}


```

### 1.3. 测试
首先连接zookeeper，创建/master节点

```java
create /master test
```

### 1.4. 结果

```java
机器3Zookeeper建立连接成功
机器4Zookeeper建立连接成功
机器2Zookeeper建立连接成功
机器1Zookeeper建立连接成功
机器5Zookeeper建立连接成功
机器4等待
机器1创建节点成功，成为master
机器2等待
机器3等待
机器5等待
机器1宕机
机器3等待
机器2创建节点成功，成为master
机器5等待
机器4等待
机器2宕机
机器4等待
机器3创建节点成功，成为master
机器5等待
机器3宕机
机器5等待
机器4创建节点成功，成为master
机器4宕机
机器5创建节点成功，成为master
机器5宕机

Process finished with exit code -1

```

## 2. Zookeeper master选举原理
和[Zookeeper分布式锁.md](Zookeeper分布式锁.md)一样创建临时有序节点+监听比自己小一号的节点删除事件
1. 每个client向/master创建临时有序节点
2. 数字最小的client当选master
3. 其他client监听比自己小1的节点删除事件，如果删除了那么判断是否是所有client中最小的，是则当选master
![zookeeper使用场景-master选举](https://raw.githubusercontent.com/TDoct/images/master/1645427534_20220221151026326_28075.png)
和[Zookeeper分布式锁.md](Zookeeper分布式锁.md)差不多