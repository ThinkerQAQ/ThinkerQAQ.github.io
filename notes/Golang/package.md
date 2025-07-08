## 1. 是什么
go组织源码的方式

## 2. 包初始化流程
![](https://raw.githubusercontent.com/TDoct/images/master/1599299641_20200905175356082_17032.png)


- package2_test.go

```go
package package2

import (
	_ "test/package2/service"
	"testing"
)

func TestPackage1(t *testing.T) {

}
```
- service.go

```go
package service

import (
	"fmt"
	_ "test/package2/dao"
)

const ServiceName = "UserService"

var Type = "service"

func init() {
	fmt.Println(ServiceName, Type)
}

```
- dao.go

```go
package dao

import (
	"fmt"
)

const DaoName = "UserDao"

var Type = "dao"

func init() {
	fmt.Println(DaoName, Type)
}

```


- 输出
```
UserDao dao
UserService service
```

## 3. 循环依赖
![](https://raw.githubusercontent.com/TDoct/images/master/1599299352_20200905174639505_16502.png)

- package1_test.go

```go
package package1

import (
	_ "test/package1/dao"
	_ "test/package1/service"

	"testing"
)

func TestPackage1(t *testing.T) {

}

```

- dao.go

```go
package dao

import (
	"fmt"
	"test/package1/service"
)

const DaoName = "dao"

type Dao struct {
}

func (d Dao) GetUser() {
	fmt.Println(service.ServiceName)
}

```

- service.go

```go
package service

import (
	"fmt"
	"test/package1/dao"
)

const ServiceName = "service"

type Service struct {
}

func (s Service) GetUser() {
	fmt.Println(dao.DaoName)
}
```


- 输出
```go
import cycle not allowed
package test/package1 (test)
	imports test/package1/dao
	imports test/package1/service
	imports test/package1/dao
```

可以看出`test/package1/dao`导入了`test/package1/service`，而`test/package1/service`导入了`test/package1/dao`，因此循环依赖了


## 4. 常用的包
### 4.1. context
- [context.md](context.md)
### 4.2. http
- [http.md](http.md)

### 4.3. 数据库
- [sql.md](sql.md)
### 4.4. 序列化
- [bashtian/jsonutils: Converter for JSON data to a Go struct or a Java class for GSON](https://github.com/bashtian/jsonutils)
- [golang解析yaml文件\_golang\_skh2015java的博客\-CSDN博客](https://blog.csdn.net/skh2015java/article/details/85791430)
- [go\-yaml/yaml at v3](https://github.com/go-yaml/yaml/tree/v3)
- [你需要知道的那些go语言json技巧 \| 李文周的博客](https://www.liwenzhou.com/posts/Go/json_tricks_in_go/)
- [protobuf初识 \| 李文周的博客](https://www.liwenzhou.com/posts/Go/protobuf/)
#### 4.4.1. JSON
[tidwall/gjson: Get JSON values quickly \- JSON parser for Go](https://github.com/tidwall/gjson)
[深入 Go 中各个高性能 JSON 解析库 \- luozhiyun\`s Blog](https://www.luozhiyun.com/archives/535)
### 4.5. I/O
- [io.md](io.md)
### 4.6. log
- [第三方日志库logrus使用 \| 李文周的博客](https://www.liwenzhou.com/posts/Go/go_logrus/)
- [在Go语言项目中使用Zap日志库 \| 李文周的博客](https://www.liwenzhou.com/posts/Go/zap/)
### 4.7. redis
- [gomodule/redigo: Go client for Redis](https://github.com/gomodule/redigo)
- [redis \- GoDoc](https://godoc.org/github.com/gomodule/redigo/redis#pkg-variables)
### 4.8. kafka
#### 4.8.1. sarama
- [Shopify/sarama: Sarama is a Go library for Apache Kafka 0\.8, and up\.](https://github.com/Shopify/sarama)
- [go操作kafka \| 李文周的博客](https://www.liwenzhou.com/posts/Go/go_kafka/)
- 例子
    - producer

    ```go
    const TopicName = "TopicName"

    func main() {
    	config := sarama.NewConfig()
    	config.Producer.RequiredAcks = sarama.WaitForAll          // 发送完数据需要leader和follow都确认
    	config.Producer.Partitioner = sarama.NewRandomPartitioner // 新选出一个partition
    	config.Producer.Return.Successes = true                   // 成功交付的消息将在success channel返回

    	// 连接kafka
    	producer, err := sarama.NewSyncProducer([]string{"127.0.0.1:9093"}, config)
    	if err != nil {
    		fmt.Println("producer closed, err:", err)
    		return
    	}
    	defer producer.Close()

    	i := 0
    	for {

    		// 构造一个消息
    		msg := &sarama.ProducerMessage{}
    		msg.Topic = TopicName
    		msg.Value = sarama.StringEncoder(fmt.Sprintf("this is a test log %d", i))
    		// 发送消息
    		pid, offset, err := producer.SendMessage(msg)
    		if err != nil {
    			fmt.Println("send msg failed, err:", err)
    			return
    		}
    		fmt.Printf("pid:%v offset:%v\n", pid, offset)
    		i++
    		time.Sleep(time.Second)
    	}

    }
    ```

    - consumer

    ```go

    const TopicName = "TopicName"

    func main() {
    	// When
    	consumer, err := sarama.NewConsumer([]string{"localhost:9093"}, nil)
    	if err != nil {
    		fmt.Println(err)
    		return
    	}
    	defer consumer.Close()

    	partitionList, err := consumer.Partitions(TopicName) // 根据topic取到所有的分区
    	if err != nil {
    		fmt.Println(err)
    		return
    	}
    	fmt.Println(partitionList)

    	for _, partition := range partitionList { // 遍历所有的分区

    		go func(partition int32) {

    			consumePartition, err := consumer.ConsumePartition(TopicName, partition,
    				sarama.OffsetNewest)
    			if err != nil {
    				fmt.Println(err)
    			}
    			defer consumePartition.Close()
    			for {
    				select {
    				case message := <-consumePartition.Messages():
    					fmt.Printf("topic: %v, partition: %v, offset: %v, key: %v, value: %v\n",
    						message.Topic, message.Partition,
    						message.Offset, message.Key,
    						string(message.Value))
    				case err := <-consumePartition.Errors():
    					fmt.Println(err)
    				}
    			}

    		}(partition)

    	}

    	select {}
    }

    ```
#### 4.8.2. confluent-kafka-go
[Home · edenhill/librdkafka Wiki · GitHub](https://github.com/edenhill/librdkafka/wiki#consumer)
[Kafka Go Client \| Confluent Documentation](https://docs.confluent.io/kafka-clients/go/current/overview.html#go-installation)
[kafka \- Go Documentation Server](https://docs.confluent.io/platform/current/clients/confluent-kafka-go/index.html)
[Consumer Configurations \| Confluent Documentation](https://docs.confluent.io/platform/current/installation/configuration/consumer-configs.html)

```go
func replayKafkaEvent(ctx context.Context, totalInvites int64, rankID string) {
	c, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers":                  "11.151.219.30:19092",
		"group.id":                           uuid.New().String(),
		"auto.offset.reset":                  "earliest",
		"topic.metadata.refresh.interval.ms": 5,
	})

	if err != nil {
		log.FatalContext(ctx, err)
	}
	topic := fmt.Sprintf("%s%v", "update_cache_", rankID)
	err = c.SubscribeTopics([]string{topic}, nil)
	if err != nil {
		log.FatalContext(ctx, err)
	}

	messages := make([]*kafka.Message, 0, 100000)
	for {
		msg, err := c.ReadMessage(-1)
		if err == nil {
			messages = append(messages, msg)
			chs <- msg
			//if len(messages) == 100000 {
			//	invites, _ := BatchUpdateCacheMsgConsumer(ctx, messages)
			//	if totalInvites <= invites {
			//		log.InfoContext(ctx, "rankID:%v init ok, invites:%v", rankID, invites)
			//		once.Do(func() {
			//			InitHotRankCacheFinished <- 1
			//		})
			//	}
			//	messages = make([]*kafka.Message, 0, 100000)
			//}
		} else {
			log.ErrorContextf(ctx, "Consumer error: %v (%v)\n", err, msg)
		}
	}
	//go func(c *kafka.Consumer) {
	//	partitions, err := c.Assignment()
	//	if err != nil {
	//		fmt.Fprintf(os.Stderr, "设置topic失败: %s\n", err)
	//		os.Exit(1)
	//	}
	//	partitions, err = c.OffsetsForTimes(partitions, ts.Second()*100000)
	//	if err != nil {
	//		fmt.Fprintf(os.Stderr, "设置topic失败: %s\n", err)
	//		os.Exit(1)
	//	}
	//	for _, partition := range partitions {
	//		c.Seek(partition, 0)
	//	}
	//	for {
	//		msg, err := c.ReadMessage(-1)
	//		if err == nil {
	//			messages = append(messages, msg)
	//			if len(messages) == 100000 {
	//				BatchUpdateCacheMsgConsumer(ctx, messages)
	//				messages = make([]*kafka.Message, 0, 100000)
	//			}
	//			ts = msg.Timestamp
	//			if totalInvites == 100000 {
	//				break
	//			}
	//		} else {
	//			log.Errorf("Consumer error: %v (%v)\n", err, msg)
	//		}
	//	}
	//	c.Close()
	//}(c)

}
```

### 4.9. cache
- [Golang \| 本地缓存原理总结与选型对比 \- 掘金](https://juejin.cn/post/7101994349252050980)
### 4.10. 格式化

- 安装
```go
go get -u github.com/cuonglm/gocmt
```
- 在项目根目录下执行
```
gocmt -d ./ -i
```

### 4.11. 协程池
[alitto/pond: 🔘 Minimalistic and High\-performance goroutine worker pool written in Go](https://github.com/alitto/pond)


### 4.12. error
[golang/xerrors](https://github.com/golang/xerrors)
[xerrors package \- golang\.org/x/xerrors \- Go Packages](https://pkg.go.dev/golang.org/x/xerrors)

### 4.13. errgroup
[errgroup package \- golang\.org/x/sync/errgroup \- Go Packages](https://pkg.go.dev/golang.org/x/sync/errgroup)
[sync/errgroup at master · golang/sync](https://github.com/golang/sync/tree/master/errgroup)
[golang 详解协程——errgroup \- CodeAntenna](https://codeantenna.com/a/xGc5H5jYdx)
[聊聊 ErrorGroup 的用法和拓展 \| Mark's Blog](https://marksuper.xyz/2021/10/15/error_group/)

### 4.14. awesome go
[Awesome Go \| LibHunt](https://go.libhunt.com/)


## 5. 参考
- [go \- Import cycle not allowed \- Stack Overflow](https://stackoverflow.com/questions/28256923/import-cycle-not-allowed)

