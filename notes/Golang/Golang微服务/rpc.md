## 1. Golang RPC
- server

```go
import (
	"fmt"
	"net"
	"net/http"
	"net/rpc"
)

type Panda int

func (this *Panda) Getinfo(argType int, replyType *int) error {
	fmt.Println("远程调用传递过来的参数：", argType)

	*replyType = 1 + argType

	return nil
}

func main() {
	pd := new(Panda)
	//注册服务，Register会对外暴露pd的所有public方法
	rpc.Register(pd)
	rpc.HandleHTTP()
	ln, err := net.Listen("tcp", "127.0.0.1:10086")
	if err != nil {
		fmt.Println("Listen 失败")
	}
	http.Serve(ln, nil)
}
```

- client

```go
import (
	"fmt"
	"net/rpc"
)

func main() {
	cli, err := rpc.DialHTTP("tcp", "127.0.0.1:10086")
	if err != nil {
		fmt.Println("网络连接失败")
	}

	var val int
	//远程调用函数（被调用的方法，传入的参数 ，返回的参数）
	err = cli.Call("Panda.Getinfo", 123, &val)
	if err != nil {
		fmt.Println("call失败")
	}
	fmt.Println("远程调用返回结果：", val)

}
```

## 2. gRPC

- hello_server.proto

```go
syntax = "proto3";

option go_package = ".;my_grpc_proto";

service HelloServer {
    rpc SayHello (HelloRequest) returns (HelloResponse) {
    }
}

message HelloRequest {
    string name = 1;
}


message HelloResponse {
    string message = 1;
}

```

- 生成go文件

```
protoc --go_out=./ *.proto

```

- server

```go
package main

import (
	"fmt"
	"google.golang.org/grpc"
	"my_demo/proto_test/grpc/protobuf"
	"net"

	"context"
)

const (
	post = "127.0.0.1:18881"
)

//对象要和proto内定义的服务一样
type server struct{}

//实现RPC SayHello 接口
func (this *server) SayHello(ctx context.Context, in *protobuf.HelloRequest) (*protobuf.HelloResponse, error) {
	return &protobuf.HelloResponse{Message: "hello" + in.Name}, nil
}

func main() {
	//创建网络
	ln, err := net.Listen("tcp", post)
	if err != nil {
		fmt.Println("网络异常", err)
	}

	//	创建一个grpc的句柄
	srv := grpc.NewServer()
	//将server结构体注册到 grpc服务中
	protobuf.RegisterHelloServerServer(srv, &server{})

	//监听grpc服务
	err = srv.Serve(ln)
	if err != nil {
		fmt.Println("网络启动异常", err)
	}

}

```


- client

```go
package main

import (
	"context"
	"fmt"
	"google.golang.org/grpc"
	"my_demo/proto_test/grpc/protobuf"
)

const (
	post = "127.0.0.1:18881"
)
func main() {

	//	客户端连接服务器
	conn, err := grpc.Dial(post, grpc.WithInsecure())
	if err != nil {
		fmt.Println("连接服务器失败", err)
	}

	defer conn.Close()

	//获得grpc句柄
	c := protobuf.NewHelloServerClient(conn)

	//远程调用 SayHello接口
	r1, err := c.SayHello(context.Background(), &protobuf.HelloRequest{Name: "panda"})
	if err != nil {
		fmt.Println("cloud not get Hello server ..", err)
		return
	}
	fmt.Println("HelloServer resp: ", r1.Message)

}

```