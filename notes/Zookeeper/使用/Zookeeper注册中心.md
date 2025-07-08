

## 2. Zookeeper注册中心实现

### 2.1. pom.xml

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

### 2.2. 代码
```java
public class RegistryCenter
{
    private final String REGISTRY_PATH = "/registry/";

    public static void main(String[] args)
    {

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

    public void register(ZooKeeper zooKeeper, String ip)
    {
        zooKeeper.create(REGISTRY_PATH + ip, "".getBytes(), ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL, new AsyncCallback.StringCallback()
        {
            @Override
            public void processResult(int rc, String path, Object ctx, String name)
            {
                if (rc == KeeperException.Code.OK.intValue() )
                {
                    System.out.println(ip + "上线");
                    try
                    {
                        List<String> children = zooKeeper.getChildren(REGISTRY_PATH, new Watcher()
                        {
                            @Override
                            public void process(WatchedEvent event)
                            {
                                if (event.getType() == Event.EventType.NodeChildrenChanged)
                                {

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
                    System.out.println("状态异常");
                }
            }
        },"ctx_data");

    }
}

```

## 1. Zookeeper注册中心原理
![zookeeper使用场景-注册中心](https://raw.githubusercontent.com/TDoct/images/master/1645427651_20220221151408055_13926.png)
创建临时有序节点+监听父节点的子节点变化事件