## 1. 什么是RPC

- 远程过程调用
- 是一个计算机通信协议
    - 这种协议使得client可以像调用本地函数一样去调用server上的函数，即屏蔽了网络通讯的细节
    - 采用C/S模式，经典实现是request-response
### 1.1. 本地函数调用 vs RPC
- 本地函数调用：不需要经过网络
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1621261570_20210517193158267_11235.png)
- RPC：需要经过网络
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1621261575_20210517193227598_9923.png)


## 2. 为什么需要 RPC 框架
用来屏蔽 rpc 调用过程中，跟业务代码无关的底层技术细节。比如网络通信、序列化与反序列化等、寻址问题等



## 3. RPC调用的整体过程
![](https://raw.githubusercontent.com/TDoct/images/master/1621178411_20210516230512750_18999.png)

1. The client process calls the client stub, which resides within the client's address space.
2. The client stub packs the parameters into a message. This is called marshaling. The
client stub then executes a system call (e.g., sendto) to send the message.
3. The kernel sends the message to the remote server machine.
4. The server stub receives the message from the kernel.
5. The server stub unmarshals the parameters.
6. The server stub calls the desired procedure.
7. The server process executes the procedure and returns the result to the server stub.
8. The server stub marshals the results into a message and passes the message to the kernel.
9. The kernel sends the message to the client machine.
10. The client stub receives the message from the kernel.
11. The client stub unmarshals the results and passes them to the caller

- ![](https://raw.githubusercontent.com/TDoct/images/master/1621178433_20210516232004272_16841.png)

## 4. 如何实现RPC
调用网络上某台机器的某个函数，传参并获取返回值
### 4.1. 如何跟远程机器通信

#### 4.1.1. 网络传输
网络模型：IO多路复用+零拷贝
TCP vs UDP
大端 vs 小端

实现如下：
```go

// Transport will use TLV protocol
type Transport struct {
	conn net.Conn // Conn is a generic stream-oriented network connection.
}

// NewTransport creates a Transport
func NewTransport(conn net.Conn) *Transport {
	return &Transport{conn}
}

// Send TLV encoded data over the network
func (t *Transport) Send(data []byte) error {
	// we will need 4 more byte then the len of data
	// as TLV header is 4bytes and in this header
	// we will encode how much byte of data
	// we are sending for this request.
	buf := make([]byte, 4+len(data))
	binary.BigEndian.PutUint32(buf[:4], uint32(len(data)))
	copy(buf[4:], data)
	_, err := t.conn.Write(buf)
	if err != nil {
		return err
	}
	return nil
}

// Read TLV Data sent over the wire
func (t *Transport) Read() ([]byte, error) {
	header := make([]byte, 4)
	_, err := io.ReadFull(t.conn, header)
	if err != nil {
		return nil, err
	}
	dataLen := binary.BigEndian.Uint32(header)
	data := make([]byte, dataLen)
	_, err = io.ReadFull(t.conn, data)
	if err != nil {
		return nil, err
	}
	return data, nil
}

```
#### 4.1.2. 协议设计（Decode/Encode）
指的是应用层的协议，比如HTTP协议
为什么需要协议？-- 解决TCP粘包的问题
如何设计协议？参考HTTP，header+body，其中body是不定长的，长度在header中读取，而header为了可扩展性也设计成不定长的，分成固定部分和协议头内容
![](https://static001.geekbang.org/resource/image/2a/72/2a202f980458baca9fc50c53275c6772.jpg)
实现如下：
```go
// header
    length int32
// body
    // RPCdata represents the serializing format of structured data
    type RPCdata struct {
    	Name string        // name of the function
    	Args []interface{} // request's or response's body expect error.
    	Err  string        // Error any executing remote server
    }
```

#### 4.1.3. 序列化与反序列化（Serialize/DeSerialize）
为什么需要序列化？--网络传输的数据必须是二进制数据，但调用方请求的出入参数都是对象
如何实现序列化？JSON、Hessian、Protobuf。考虑安全性>通用性>兼容性>性能>效率>空间开销

- Marshaling：
    - Client：parameters->message
    - Server：return value->message
    - message指的是某种格式的字节数组
- Unmarshaling
    - Client：message->return value
    - Server：message->parameters
    - message指的是某种格式的字节数组

实现如下：
```go
// Encode The RPCdata in binary format which can
// be sent over the network.
func Encode(data RPCdata) ([]byte, error) {
	var buf bytes.Buffer
	encoder := gob.NewEncoder(&buf)
	if err := encoder.Encode(data); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// Decode the binary data into the Go RPC struct
func Decode(b []byte) (RPCdata, error) {
	buf := bytes.NewBuffer(b)
	decoder := gob.NewDecoder(buf)
	var data RPCdata
	if err := decoder.Decode(&data); err != nil {
		return RPCdata{}, err
	}
	return data, nil
}
```

### 4.2. 如何像本地函数一样调用远程函数
面向接口编程

- 静态：Stub Generation
- 动态：Reflection
- ![](https://raw.githubusercontent.com/TDoct/images/master/1618628457_20210417110025943_3766.png)
#### 4.2.1. Stub Generation
- ![](https://raw.githubusercontent.com/TDoct/images/master/1621261576_20210517194343009_23981.png)

- IDL compiler：读取IDL，自动生成client stub和server stub

#### 4.2.2. Reflection
- server

    ```go

    // Execute the given function if present
    func (s *RPCServer) Execute(req dataserial.RPCdata) dataserial.RPCdata {
    	// get method by name
    	f, ok := s.funcs[req.Name]
    	if !ok {
    		// since method is not present
    		e := fmt.Sprintf("func %s not Registered", req.Name)
    		log.Println(e)
    		return dataserial.RPCdata{Name: req.Name, Args: nil, Err: e}
    	}

    	log.Printf("func %s is called\n", req.Name)
    	// unpack request arguments
    	inArgs := make([]reflect.Value, len(req.Args))
    	for i := range req.Args {
    		inArgs[i] = reflect.ValueOf(req.Args[i])
    	}

    	// invoke requested method
    	out := f.Call(inArgs)
    	// now since we have followed the function signature style where last argument will be an error
    	// so we will pack the response arguments expect error.
    	resArgs := make([]interface{}, len(out)-1)
    	for i := 0; i < len(out)-1; i++ {
    		// Interface returns the constant value stored in v as an interface{}.
    		resArgs[i] = out[i].Interface()
    	}

    	// pack error argument
    	var er string
    	if _, ok := out[len(out)-1].Interface().(error); ok {
    		// convert the error into error string value
    		er = out[len(out)-1].Interface().(error).Error()
    	}
    	return dataserial.RPCdata{Name: req.Name, Args: resArgs, Err: er}
    }
    ```
- client

    ```go
    func (c *Client) CallRPC(rpcName string, fPtr interface{}) {
    	container := reflect.ValueOf(fPtr).Elem()
    	f := func(req []reflect.Value) []reflect.Value {
    		cReqTransport := transport.NewTransport(c.conn)
    		errorHandler := func(err error) []reflect.Value {
    			outArgs := make([]reflect.Value, container.Type().NumOut())
    			for i := 0; i < len(outArgs)-1; i++ {
    				outArgs[i] = reflect.Zero(container.Type().Out(i))
    			}
    			outArgs[len(outArgs)-1] = reflect.ValueOf(&err).Elem()
    			return outArgs
    		}

    		// Process input parameters
    		inArgs := make([]interface{}, 0, len(req))
    		for _, arg := range req {
    			inArgs = append(inArgs, arg.Interface())
    		}

    		// ReqRPC
    		reqRPC := dataserial.RPCdata{Name: rpcName, Args: inArgs}
    		b, err := dataserial.Encode(reqRPC)
    		if err != nil {
    			panic(err)
    		}
    		err = cReqTransport.Send(b)
    		if err != nil {
    			return errorHandler(err)
    		}
    		// receive response from server
    		rsp, err := cReqTransport.Read()
    		if err != nil { // local network error or decode error
    			return errorHandler(err)
    		}
    		rspDecode, _ := dataserial.Decode(rsp)
    		if rspDecode.Err != "" { // remote server error
    			return errorHandler(errors.New(rspDecode.Err))
    		}

    		if len(rspDecode.Args) == 0 {
    			rspDecode.Args = make([]interface{}, container.Type().NumOut())
    		}
    		// unpack response arguments
    		numOut := container.Type().NumOut()
    		outArgs := make([]reflect.Value, numOut)
    		for i := 0; i < numOut; i++ {
    			if i != numOut-1 { // unpack arguments (except error)
    				if rspDecode.Args[i] == nil { // if argument is nil (gob will ignore "Zero" in transmission), set "Zero" value
    					outArgs[i] = reflect.Zero(container.Type().Out(i))
    				} else {
    					outArgs[i] = reflect.ValueOf(rspDecode.Args[i])
    				}
    			} else { // unpack error argument
    				outArgs[i] = reflect.Zero(container.Type().Out(i))
    			}
    		}

    		return outArgs
    	}
    	container.Set(reflect.MakeFunc(container.Type(), f))
    }

    ```
### 4.3. 如何设计跨语言的接口
#### 4.3.1. IDL
IDL用来指定service interfaces：由一组函数组成（服务端实现，客户端调用）
### 4.4. 如何找到server

#### 4.4.1. 名字服务（服务注册）
[如何设计注册中心.md](../微服务/如何设计注册中心.md)
#### 4.4.2. 寻址（服务发现）
[如何设计注册中心.md](../微服务/如何设计注册中心.md)
#### 4.4.3. 负载均衡
[如何设计负载均衡组件.md](../微服务/如何设计负载均衡组件.md)


### 4.5. 如何优化
#### 4.5.1. 超时重试

[如何设计超时与重试系统.md](如何设计超时与重试系统.md)
#### 4.5.2. 熔断
[如何设计熔断系统.md](如何设计熔断系统.md)
#### 4.5.3. 流控
[如何设计一个限流系统.md](如何设计一个限流系统.md)
#### 4.5.4. 安全
#### 4.5.5. 异常
封装异常类，区分业务异常和网络异常
如果是网络异常，那么可以重试
如果是业务异常，那么根据情况决定是否重试
#### 4.5.6. 同步/异步
- ![](https://raw.githubusercontent.com/TDoct/images/master/1618628458_20210417110053024_32606.png)
- 为什么需要异步：如果服务端的业务逻辑比较耗时，并且CPU大部分时间都在等待而没有去计算，导致CPU利用率不够，那么使用异步RPC可以提升吞吐量
- 如何实现异步：
    - 调用端的异步就是通过Future方式实现异步，调用端发起一次异步请求并且从请求上下文中拿到一个Future，之后通过Future的get方法获取结果，如果业务逻辑中同时调用多个其它的服务，则可以通过Future的方式减少业务逻辑的耗时，提升吞吐量。
    - 服务端异步则需要一种回调方式，让业务逻辑可以异步处理，之后调用RPC框架提供的回调接口，将最终结果异步通知给调用端。


### 4.6. 如何优雅停机
- 为什么需要优雅停机
    - 新的请求：服务端重启或关闭，调用方是无法快速感知到的
    - 已接受的请求：请求还没有处理完成
- 什么是优雅停机
    - 处理停机过程中已接受的请求和新的请求
- 如何优雅停机
    1. 没处理完的请求：继续处理，同时为防止请求一直没处理完成服务无法关闭，可以加上超时控制
    2. 新请求的处理：拒绝新请求

### 4.7. 代码架构设计
#### 4.7.1. 分层设计
![](https://static001.geekbang.org/resource/image/a3/a6/a3688580dccd3053fac8c0178cef4ba6.jpg)

## 5. 参考
- [RPC 框架设计 \- ice\_image \- 博客园](https://www.cnblogs.com/ice-image/p/14554250.html#_label0_2)
- [谁能用通俗的语言解释一下什么是 RPC 框架？ \- 知乎](https://www.zhihu.com/question/25536695)
- [设计一个分布式RPC框架](https://juejin.cn/post/6844903773618307086)
- [设计一个简单的rpc框架，写一个http协议怎么做](https://maimai.cn/web/gossip_detail?gid=28110798&egid=e12e17343af511eb9551801844e50190)
- [ankur\-anand/simple\-go\-rpc: RPC explained by writing simple RPC framework in 300 lines of pure Golang\.](https://github.com/ankur-anand/simple-go-rpc)
- [远程服务调用 \| 凤凰架构](http://icyfenix.cn/architect-perspective/general-architecture/api-style/rpc.html#%E4%B8%89%E4%B8%AA%E5%9F%BA%E6%9C%AC%E9%97%AE%E9%A2%98)
- [远程过程调用 \- 维基百科，自由的百科全书](https://zh.wikipedia.org/wiki/%E9%81%A0%E7%A8%8B%E9%81%8E%E7%A8%8B%E8%AA%BF%E7%94%A8)