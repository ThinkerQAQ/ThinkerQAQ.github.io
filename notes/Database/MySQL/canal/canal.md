## 1. canal是什么
- 解析MySQL bin-log的组件
## 2. 为什么需要canal
- 获取MySQL数据增量变化，同步到Elasticsearch、Redis等组件中
## 3. canal原理
- 本质上就是模拟主从复制的slave，所以跟[MySQL主从复制.md](../MySQL主从复制.md)一样
## 4. 如何使用canal
### 4.1. 单机版
#### 4.1.1. 搭建MySQL
1. 安装
    - [MySQL安装配置.md](../MySQL安装配置.md)
2. 开启MySQL主从复制
    - [MySQL主从复制.md](../MySQL主从复制.md)
3. 创建用户
    ```sql
    CREATE USER canal IDENTIFIED BY 'canal';  
    GRANT SELECT, INSERT,UPDATE,DELETE,ALTER,DROP,REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'canal'@'%';
    FLUSH PRIVILEGES;
    ```
#### 4.1.2. 搭建canal-server
1. 下载
    - ` wget https://github.com/alibaba/canal/releases/download/canal-1.1.5/canal.deployer-1.1.5.tar.gz`
2. 解压
3. vim conf/example/instance.properties
    ```properties
    #canal.instance.tsdb.dbUsername=canal
    #canal.instance.tsdb.dbPassword=canal

    #canal.instance.standby.address =
    #canal.instance.standby.journal.name =
    #canal.instance.standby.position =
    #canal.instance.standby.timestamp =
    #canal.instance.standby.gtid=

    # 2. username/password
    canal.instance.dbUsername=canal
    canal.instance.dbPassword=canal
    canal.instance.connectionCharset = UTF-8
    # 3. enable druid Decrypt database password
    canal.instance.enableDruid=false
    #canal.instance.pwdPublicKey=MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALK4BUxdDltRRE5/zXpVEVPUgunvscYFtEip3pmLlhrWpacX7y7GCMo2/JM6LeHmiiNdH1FWgGCpUfircSwlWKUCAwEAAQ==

    # 4. table regex
    canal.instance.filter.regex=.*\\..*
    # 5. table black regex
    canal.instance.filter.black.regex=mysql\\.slave_.*
    # 6. table field filter(format: schema1.tableName1:field1/field2,schema2.tableName2:field1/field2)
    #canal.instance.filter.field=test1.t_product:id/subject/keywords,test2.t_company:id/name/contact/ch
    # 7. table field black filter(format: schema1.tableName1:field1/field2,schema2.tableName2:field1/field2)
    #canal.instance.filter.black.field=test1.t_product:subject/product_image,test2.t_company:id/name/contact/ch

    # 8. mq config
    canal.mq.topic=example
    # 9. dynamic topic route by schema or table regex
    #canal.mq.dynamicTopic=mytest1.user,mytest2\\..*,.*\\..*
    canal.mq.partition=0
    # 10. hash partition config
    #canal.mq.partitionsNum=3
    #canal.mq.partitionHash=test.table:id^name,.*\\..*
    #canal.mq.dynamicTopicPartitionNum=test.*:4,mycanal:6
    #################################################

    ```
4. 启动
    - `bin/startup.sh`
5. 查看server日志
    - `vim logs/canal/canal.log`
5. 查看instance日志
    - `vim logs/example/example.log`
#### 4.1.3. 搭建canal-client
1. 新建maven工程
    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <project xmlns="http://maven.apache.org/POM/4.0.0"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
        <modelVersion>4.0.0</modelVersion>

        <groupId>org.example</groupId>
        <artifactId>canaltest</artifactId>
        <version>1.0-SNAPSHOT</version>
        <dependencies>
            <dependency>
                <groupId>com.alibaba.otter</groupId>
                <artifactId>canal.client</artifactId>
                <version>1.1.0</version>
            </dependency>
        </dependencies>

    </project>
    ```
2. 新建SimpleCanalClientExample.java
    ```java
    package com.alibaba.otter.canal.sample;

    import java.net.InetSocketAddress;
    import java.util.List;


    import com.alibaba.otter.canal.client.CanalConnectors;
    import com.alibaba.otter.canal.client.CanalConnector;
    import com.alibaba.otter.canal.common.utils.AddressUtils;
    import com.alibaba.otter.canal.protocol.Message;
    import com.alibaba.otter.canal.protocol.CanalEntry.Column;
    import com.alibaba.otter.canal.protocol.CanalEntry.Entry;
    import com.alibaba.otter.canal.protocol.CanalEntry.EntryType;
    import com.alibaba.otter.canal.protocol.CanalEntry.EventType;
    import com.alibaba.otter.canal.protocol.CanalEntry.RowChange;
    import com.alibaba.otter.canal.protocol.CanalEntry.RowData;


    public class SimpleCanalClientExample
    {


        public static void main(String args[])
        {
            // 创建链接
            CanalConnector connector = CanalConnectors.newSingleConnector(new InetSocketAddress(AddressUtils.getHostIp(), 11111), "example", "", "");
            int batchSize = 1000;
            int emptyCount = 0;
            try
            {
                connector.connect();
                connector.subscribe(".*\\..*");
                connector.rollback();
                int totalEmptyCount = 120;
                while (emptyCount < totalEmptyCount)
                {
                    Message message = connector.getWithoutAck(batchSize); // 获取指定数量的数据
                    long batchId = message.getId();
                    int size = message.getEntries().size();
                    if (batchId == -1 || size == 0)
                    {
                        emptyCount++;
                        System.out.println("empty count : " + emptyCount);
                        try
                        {
                            Thread.sleep(1000);
                        }
                        catch (InterruptedException e)
                        {
                        }
                    }
                    else
                    {
                        emptyCount = 0;
                        // System.out.printf("message[batchId=%s,size=%s] \n", batchId, size);
                        printEntry(message.getEntries());
                    }

                    connector.ack(batchId); // 提交确认
                    // connector.rollback(batchId); // 处理失败, 回滚数据
                }

                System.out.println("empty too many times, exit");
            }
            finally
            {
                connector.disconnect();
            }
        }

        private static void printEntry(List<Entry> entrys)
        {
            for (Entry entry : entrys)
            {
                if (entry.getEntryType() == EntryType.TRANSACTIONBEGIN || entry.getEntryType() == EntryType.TRANSACTIONEND)
                {
                    continue;
                }

                RowChange rowChage = null;
                try
                {
                    rowChage = RowChange.parseFrom(entry.getStoreValue());
                }
                catch (Exception e)
                {
                    throw new RuntimeException("ERROR ## parser of eromanga-event has an error , data:" + entry.toString(), e);
                }

                EventType eventType = rowChage.getEventType();
                System.out.println(String.format("================&gt; binlog[%s:%s] , name[%s,%s] , eventType : %s", entry.getHeader().getLogfileName(), entry.getHeader().getLogfileOffset(), entry.getHeader().getSchemaName(), entry.getHeader().getTableName(), eventType));

                for (RowData rowData : rowChage.getRowDatasList())
                {
                    if (eventType == EventType.DELETE)
                    {
                        printColumn(rowData.getBeforeColumnsList());
                    }
                    else if (eventType == EventType.INSERT)
                    {
                        printColumn(rowData.getAfterColumnsList());
                    }
                    else
                    {
                        System.out.println("-------&gt; before");
                        printColumn(rowData.getBeforeColumnsList());
                        System.out.println("-------&gt; after");
                        printColumn(rowData.getAfterColumnsList());
                    }
                }
            }
        }

        private static void printColumn(List<Column> columns)
        {
            for (Column column : columns)
            {
                System.out.println(column.getName() + " : " + column.getValue() + "    update=" + column.getUpdated());
            }
        }

    }
    ```
3. 启动SimpleCanalClientExample
### 4.2. 集群版
#### 4.2.1. 搭建Zookeeper集群
- [集群架构.md](../../../Zookeeper/原理/集群架构.md)
#### 4.2.2. 搭建Kafka集群
1. 安装
    - [Kafka安装.md](../../../Message_Queue/Kafka/Kafka安装.md)
2. 新建Topic
    ```
    kafka-topics.sh --create --zookeeper localhost:2181 --partitions 2 --replication-factor 1 --topic example
    ```
#### 4.2.3. 搭建MySQL
1. 安装
    - [MySQL安装配置.md](../MySQL安装配置.md)
2. 开启MySQL主从复制
    - [MySQL主从复制.md](../MySQL主从复制.md)
3. 创建用户
    ```sql
    CREATE USER canal IDENTIFIED BY 'canal';  
    GRANT SELECT, INSERT,UPDATE,DELETE,ALTER,DROP,REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'canal'@'%';
    FLUSH PRIVILEGES;
    ```
#### 4.2.4. 搭建canal-admin
1. 下载
    - `wget https://github.com/alibaba/canal/releases/download/canal-1.1.5/canal.admin-1.1.5.tar.gz`
2. 解压
3. vim conf/application.yml
    - 修改配置如下
    
    ```yml
    server:
      port: 8089
    spring:
      jackson:
        date-format: yyyy-MM-dd HH:mm:ss
        time-zone: GMT+8

    spring.datasource:
      address: 127.0.0.1:3306
      database: canal_manager
      username: canal
      password: canal
      driver-class-name: com.mysql.jdbc.Driver
      url: jdbc:mysql://${spring.datasource.address}/${spring.datasource.database}?useUnicode=true&characterEncoding=UTF-8&useSSL=false
      hikari:
        maximum-pool-size: 30
        minimum-idle: 1

    canal:
      adminUser: admin
      adminPasswd: admin
    ```
4. 导入元数据库
    ```
    mysql -h127.1 -uroot -p
    # 2. 导入初始化SQL
    > source conf/canal_manager.sql
    ```
5. 启动
    - `bin/startup.sh`
6. 查看admin日志
    - `vim logs/admin.log`
7.  打开admin后台
    - http://127.0.0.1:8089/，用户名密码为`admin/123456`
    - 新建集群
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1624202298_20210620231207981_30791.png =500x)
    - 修改主配置
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1624202299_20210620231240412_20243.png =500x)
    - 载入模板-修改-保存
        ```yml
        #################################################
        ######### 		common argument		#############
        #################################################
        # 2. tcp bind ip
        canal.ip =
        # 3. register ip to zookeeper
        canal.register.ip =
        canal.port = 11111
        canal.metrics.pull.port = 11112
        # 4. canal instance user/passwd
        # 5. canal.user = canal
        # 6. canal.passwd = E3619321C1A937C46A0D8BD1DAC39F93B27D4458

        # 7. canal admin config
        #canal.admin.manager = 127.0.0.1:8089
        canal.admin.port = 11110
        canal.admin.user = admin
        canal.admin.passwd = 4ACFE3202A5FF5CF467898FC58AAB1D615029441
        # 8. admin auto register
        #canal.admin.register.auto = true
        #canal.admin.register.cluster =
        #canal.admin.register.name =

        canal.zkServers = 127.0.0.1:2181,127.0.0.1:2182,127.0.0.1:2183
        # 9. flush data to zk
        canal.zookeeper.flush.period = 1000
        canal.withoutNetty = false
        # 10. tcp, kafka, rocketMQ, rabbitMQ
        canal.serverMode = kafka
        # 11. flush meta cursor/parse position to file
        canal.file.data.dir = ${canal.conf.dir}
        canal.file.flush.period = 1000
        ## 11.1. memory store RingBuffer size, should be Math.pow(2,n)
        canal.instance.memory.buffer.size = 16384
        ## 11.2. memory store RingBuffer used memory unit size , default 1kb
        canal.instance.memory.buffer.memunit = 1024 
        ## 11.3. meory store gets mode used MEMSIZE or ITEMSIZE
        canal.instance.memory.batch.mode = MEMSIZE
        canal.instance.memory.rawEntry = true

        ## 11.4. detecing config
        canal.instance.detecting.enable = false
        #canal.instance.detecting.sql = insert into retl.xdual values(1,now()) on duplicate key update x=now()
        canal.instance.detecting.sql = select 1
        canal.instance.detecting.interval.time = 3
        canal.instance.detecting.retry.threshold = 3
        canal.instance.detecting.heartbeatHaEnable = false

        # 12. support maximum transaction size, more than the size of the transaction will be cut into multiple transactions delivery
        canal.instance.transaction.size =  1024
        # 13. mysql fallback connected to new master should fallback times
        canal.instance.fallbackIntervalInSeconds = 60

        # 14. network config
        canal.instance.network.receiveBufferSize = 16384
        canal.instance.network.sendBufferSize = 16384
        canal.instance.network.soTimeout = 30

        # 15. binlog filter config
        canal.instance.filter.druid.ddl = true
        canal.instance.filter.query.dcl = false
        canal.instance.filter.query.dml = false
        canal.instance.filter.query.ddl = false
        canal.instance.filter.table.error = false
        canal.instance.filter.rows = false
        canal.instance.filter.transaction.entry = false
        canal.instance.filter.dml.insert = false
        canal.instance.filter.dml.update = false
        canal.instance.filter.dml.delete = false

        # 16. binlog format/image check
        canal.instance.binlog.format = ROW,STATEMENT,MIXED 
        canal.instance.binlog.image = FULL,MINIMAL,NOBLOB

        # 17. binlog ddl isolation
        canal.instance.get.ddl.isolation = false

        # 18. parallel parser config
        canal.instance.parser.parallel = true
        ## 18.1. concurrent thread number, default 60% available processors, suggest not to exceed Runtime.getRuntime().availableProcessors()
        #canal.instance.parser.parallelThreadSize = 16
        ## 18.2. disruptor ringbuffer size, must be power of 2
        canal.instance.parser.parallelBufferSize = 256

        # 19. table meta tsdb info
        canal.instance.tsdb.enable = true
        canal.instance.tsdb.dir = ${canal.file.data.dir:../conf}/${canal.instance.destination:}
        canal.instance.tsdb.url = jdbc:h2:${canal.instance.tsdb.dir}/h2;CACHE_SIZE=1000;MODE=MYSQL;
        canal.instance.tsdb.dbUsername = canal
        canal.instance.tsdb.dbPassword = canal
        # 20. dump snapshot interval, default 24 hour
        canal.instance.tsdb.snapshot.interval = 24
        # 21. purge snapshot expire , default 360 hour(15 days)
        canal.instance.tsdb.snapshot.expire = 360

        #################################################
        ######### 		destinations		#############
        #################################################
        canal.destinations = 
        # 22. conf root dir
        canal.conf.dir = ../conf
        # 23. auto scan instance dir add/remove and start/stop instance
        canal.auto.scan = true
        canal.auto.scan.interval = 5
        # 24. set this value to 'true' means that when binlog pos not found, skip to latest.
        # 25. WARN: pls keep 'false' in production env, or if you know what you want.
        canal.auto.reset.latest.pos.mode = false

        canal.instance.tsdb.spring.xml = classpath:spring/tsdb/h2-tsdb.xml
        #canal.instance.tsdb.spring.xml = classpath:spring/tsdb/mysql-tsdb.xml

        canal.instance.global.mode = manager
        canal.instance.global.lazy = false
        canal.instance.global.manager.address = ${canal.admin.manager}
        #canal.instance.global.spring.xml = classpath:spring/memory-instance.xml
        canal.instance.global.spring.xml = classpath:spring/file-instance.xml
        #canal.instance.global.spring.xml = classpath:spring/default-instance.xml

        ##################################################
        ######### 	      MQ Properties      #############
        ##################################################
        # 26. aliyun ak/sk , support rds/mq
        canal.aliyun.accessKey =
        canal.aliyun.secretKey =
        canal.aliyun.uid=

        canal.mq.flatMessage = true
        canal.mq.canalBatchSize = 50
        canal.mq.canalGetTimeout = 100
        # 27. Set this value to "cloud", if you want open message trace feature in aliyun.
        canal.mq.accessChannel = local

        canal.mq.database.hash = true
        canal.mq.send.thread.size = 30
        canal.mq.build.thread.size = 8

        ##################################################
        ######### 		     Kafka 		     #############
        ##################################################
        kafka.bootstrap.servers = 127.0.0.1:9093,127.0.0.1:9094,127.0.0.1:9095
        kafka.acks = all
        kafka.compression.type = none
        kafka.batch.size = 16384
        kafka.linger.ms = 1
        kafka.max.request.size = 1048576
        kafka.buffer.memory = 33554432
        kafka.max.in.flight.requests.per.connection = 1
        kafka.retries = 0

        kafka.kerberos.enable = false
        kafka.kerberos.krb5.file = "../conf/kerberos/krb5.conf"
        kafka.kerberos.jaas.file = "../conf/kerberos/jaas.conf"

        ##################################################
        ######### 		    RocketMQ	     #############
        ##################################################
        rocketmq.producer.group = test
        rocketmq.enable.message.trace = false
        rocketmq.customized.trace.topic =
        rocketmq.namespace =
        rocketmq.namesrv.addr = 127.0.0.1:9876
        rocketmq.retry.times.when.send.failed = 0
        rocketmq.vip.channel.enabled = false
        rocketmq.tag = 

        ##################################################
        ######### 		    RabbitMQ	     #############
        ##################################################
        rabbitmq.host =
        rabbitmq.virtual.host =
        rabbitmq.exchange =
        rabbitmq.username =
        rabbitmq.password =
        rabbitmq.deliveryMode =
        ```
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1624202300_20210620231328891_24053.png =500x)
#### 4.2.5. 搭建canal-server
1. 下载
    - ` wget https://github.com/alibaba/canal/releases/download/canal-1.1.5/canal.deployer-1.1.5.tar.gz`
2. 解压
3. vim canal_deployer/conf/canal_local.properties
    ```properties
    # register ip
    canal.register.ip = 127.0.0.1

    # 2. canal admin config
    canal.admin.manager = 127.0.0.1:8089
    canal.admin.port = 11110
    canal.admin.user = admin
    canal.admin.passwd = 4ACFE3202A5FF5CF467898FC58AAB1D615029441
    # 3. admin auto register
    canal.admin.register.auto = true
    canal.admin.register.cluster = test_cluster
    canal.admin.register.name =  test1
    ```
4. 启动
    - ` bin/startup.sh local`
5. 查看日志
    - `vim logs/canal/canal.log`
6. 在admin后台中查看
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1624202301_20210620231513382_4651.png =500x)

#### 4.2.6. 管理Instance
- 新建instance
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1624202301_20210620231719412_17127.png =500x)
- 载入模板-修改-保存
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1624202302_20210620231754023_14538.png =500x)
    
    ```yml
    #################################################
    ## 1.5. mysql serverId , v1.0.26+ will autoGen
    # 2. canal.instance.mysql.slaveId=0

    # 3. enable gtid use true/false
    canal.instance.gtidon=false

    # 4. position info
    canal.instance.master.address=127.0.0.1:3306
    canal.instance.master.journal.name=
    canal.instance.master.position=
    canal.instance.master.timestamp=
    canal.instance.master.gtid=

    # 5. rds oss binlog
    canal.instance.rds.accesskey=
    canal.instance.rds.secretkey=
    canal.instance.rds.instanceId=

    # 6. table meta tsdb info
    canal.instance.tsdb.enable=true
    #canal.instance.tsdb.url=jdbc:mysql://127.0.0.1:3306/canal_tsdb
    #canal.instance.tsdb.dbUsername=canal
    #canal.instance.tsdb.dbPassword=canal

    #canal.instance.standby.address =
    #canal.instance.standby.journal.name =
    #canal.instance.standby.position =
    #canal.instance.standby.timestamp =
    #canal.instance.standby.gtid=

    # 7. username/password
    canal.instance.dbUsername=canal
    canal.instance.dbPassword=canal
    canal.instance.connectionCharset = UTF-8
    # 8. enable druid Decrypt database password
    canal.instance.enableDruid=false
    #canal.instance.pwdPublicKey=MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALK4BUxdDltRRE5/zXpVEVPUgunvscYFtEip3pmLlhrWpacX7y7GCMo2/JM6LeHmiiNdH1FWgGCpUfircSwlWKUCAwEAAQ==

    # 9. table regex
    canal.instance.filter.regex=.*\\..*
    # 10. table black regex
    canal.instance.filter.black.regex=
    # 11. table field filter(format: schema1.tableName1:field1/field2,schema2.tableName2:field1/field2)
    #canal.instance.filter.field=test1.t_product:id/subject/keywords,test2.t_company:id/name/contact/ch
    # 12. table field black filter(format: schema1.tableName1:field1/field2,schema2.tableName2:field1/field2)
    #canal.instance.filter.black.field=test1.t_product:subject/product_image,test2.t_company:id/name/contact/ch

    # 13. mq config
    canal.mq.topic=example
    # 14. dynamic topic route by schema or table regex
    #canal.mq.dynamicTopic=mytest1.user,mytest2\\..*,.*\\..*
    canal.mq.partition=0
    # 15. hash partition config
    #canal.mq.partitionsNum=3
    #canal.mq.partitionHash=test.table:id^name,.*\\..*
    #################################################

    ```

#### 4.2.7. Kafka消费

- 从头开始消费
    ```shell
    kafka-console-consumer.sh --bootstrap-server localhost:9093 --topic example --from-beginning
    ```
- 结果
    - 关键的字段是database、table、type、data
    ```json
    {
        "data": [
            {
                "ID": "5",
                "X": "2021-06-20 13:33:21"
            }
        ],
        "database": "test",
        "es": 1624196001000,
        "id": 3,
        "isDdl": false,
        "mysqlType": {
            "ID": "int(11)",
            "X": "timestamp"
        },
        "old": null,
        "pkNames": [
            "ID"
        ],
        "sql": "",
        "sqlType": {
            "ID": 4,
            "X": 93
        },
        "table": "xdual",
        "ts": 1624196001533,
        "type": "INSERT"
    }
    ```

## 5. 监控canal
### 5.1. prometheus安装配置
- [prometheus安装.md](../../../Monitor/prometheus/prometheus安装.md)
- vim prometheus.yml

    ```yml
    scrape_configs:
      - job_name: 'canal'
        static_configs:
        - targets: ['localhost:11112']
    ```
### 5.2. grafana安装配置
- [grafana.md](../../../Monitor/grafana/grafana.md)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624713789_20210626211956823_19931.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624713790_20210626212036962_21683.png =500x)

## 6. 常见问题
### 6.1. 解析线程阻塞问题
- `$CANAL_HOME/conf/canal.properties`配置文件中存在一行注释掉的配置：`canal.instance.parser.parallelThreadSize = 16`。该配置用于指定解析器实例并发线程数，如果注释了会导致解析线程阻塞，得到的结果就是什么都不会发生
- 解决
    - 打开注释
### 6.2. 表结构缓存异常阻塞问题
- canal默认开启tsdb，会使用h2数据库缓存解析的表结构。但是如果上游的表结构发生了变更，那么缓存是不会更新的
- 解决
    - 禁用tsdb功能，也就是canal.instance.tsdb.enable设置为false
### 6.3. bin log格式
- 一般使用row格式，但是这种格式的缺点在于日志会很多。如果刚好需要定位的binlog位点处于比较靠后的文件，文件数量比较多，会疯狂打印寻位的日志
    - 解决：$CANAL_HOME/conf/目标数据库实例标识/instance.properties的下面几个属性手动定位解析的起点
    ```properties
    canal.instance.master.journal.name=binlog的文件名
    canal.instance.master.position=binlog的文件中的位点
    canal.instance.master.timestamp=时间戳
    canal.instance.master.gtid=gtid的值
    ```
## 7. 参考
- [「从零单排canal 02」canal集群版 \+ admin控制台 最新搭建姿势（基于1\.1\.4版本） \- 阿丸 \- 博客园](https://www.cnblogs.com/awan-note/p/13089193.html)
- [In MySQL SERVER 8\.0 the PASSWORD function not working \- Stack Overflow](https://stackoverflow.com/questions/52320576/in-mysql-server-8-0-the-password-function-not-working)
- [Canal Admin QuickStart · alibaba/canal Wiki](https://github.com/alibaba/canal/wiki/Canal-Admin-QuickStart)
- [QuickStart · alibaba/canal Wiki](https://github.com/alibaba/canal/wiki/QuickStart)
- [ClientExample · alibaba/canal Wiki](https://github.com/alibaba/canal/wiki/ClientExample)
- [坑系列之canal的json解析bug \| 大名Dean鼎](https://www.asksrc.com/2021/02/14/canal-json-issue/)
- [Canal v1\.1\.4版本避坑指南 \- throwable \- 博客园](https://www.cnblogs.com/throwable/p/13449920.html)
- [开源实战 \| Canal生产环境常见问题总结与分析 \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1645881)
- [Prometheus QuickStart · alibaba/canal Wiki](https://github.com/alibaba/canal/wiki/Prometheus-QuickStart)