## 1. circuit
golang版本的hystrix实现，用于服务熔断（降级的一种措施，其他如开关熔断等）

## 2. 使用

- hystrix.go

```go
package hystrix

import (
	"expvar"
	"github.com/cep21/circuit"
	"github.com/cep21/circuit/closers/hystrix"
	"github.com/cep21/circuit/metriceventstream"
	"log"
	"net/http"
	"time"
)

var GlobalManager *circuit.Manager

func init() {
	configuration := hystrix.Factory{
		// Hystrix open logic is to open the circuit after an % of errors
		ConfigureOpener: hystrix.ConfigureOpener{
			// We change the default to wait for 10 requests, not 20, before checking to close
			RequestVolumeThreshold: 10,
			// The default values match what hystrix does by default
		},
		// Hystrix close logic is to sleep then check
		ConfigureCloser: hystrix.ConfigureCloser{
			SleepWindow: time.Second * 1,
			// The default values match what hystrix does by default
		},
	}
	//sf := rolling.StatFactory{}
	manager := circuit.Manager{
		DefaultCircuitProperties: []circuit.CommandPropertiesConstructor{configuration.Configure},
	}
	GlobalManager = &manager
	manager.MustCreateCircuit("hello", circuit.Config{
		Execution: circuit.ExecutionConfig{
			// Time out the context after a few ms
			Timeout: time.Second * 1,
		},
	})

	go startMetrics(&manager)

	go startServer()
}

func startMetrics(manager *circuit.Manager) {
	expvar.Publish("hystrix", manager.Var())

	metricEventStream := metriceventstream.MetricEventStream{
		Manager: manager,
	}
	if err := metricEventStream.Start(); err != nil {
		log.Fatal(err)
	}
}

func startServer() {
	log.Fatal(http.ListenAndServe(":8080", nil))
}

```


- main.go

```go
package main

import (
	"context"
	"fmt"
	"http_builder/builder"
	"http_builder/hystrix"
	"net/http"
	"time"
)

func main() {
	for i := 0; i < 50; i++ {
		if i == 9 {
			time.Sleep(time.Second * 2)
		}
		circuit := hystrix.GlobalManager.GetCircuit("hello")
		//使用当前线程执行
		errResult := circuit.Go(context.Background(), func(ctx context.Context) error {
			return requestBaidu(i)
		}, func(ctx context.Context, err error) error {
			fmt.Printf("第%d次执行 fallback func\n", i+1)
			return err
		})

		if errResult != nil {
			//log.Println("fallback Result of execution:", errResult)
			continue
		}

	}

	time.Sleep(time.Hour * 1)
}

func requestBaidu(i int) error {
	fmt.Printf("第%d次执行 run func\n", i+1)
	resp, cancel, err := builder.NewHttpBuilder().
		Method(http.MethodGet).
		Url("https://www.baidu.com/s").
		QueryParam("wd", "test").
		DoRequest()
	if err != nil {
		return err
	}

	cancel()
	resp.Body.Close()
	return nil
}

```

## 3. 参考
- [cep21/circuit: An efficient and feature complete Hystrix like Go implementation of the circuit breaker pattern\.](https://github.com/cep21/circuit)
- [expvar \- The Go Programming Language](https://golang.org/pkg/expvar/)
- [Golang中使用断路器](http://yangxikun.com/golang/2019/08/10/golang-circuit.html)