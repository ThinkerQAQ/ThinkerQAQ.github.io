## 1. CSP并发模型
- 从内存的角度看，并行计算只有两种：**共享内存**、**消息通信**
- 基于共享内存的并发模型通常提供互斥锁作为同步原语
- CSP 全称是 “Communicating Sequential Processes”，是一种基于消息通信的并发模型，由Tony Hoare于1977年提出
- Golang通过显式的channel同步原语实现了CSP并发模型，与此同时也提供了`sync.*、atomic.*`的基于共享内存的同步原语
## 2. channel是什么
Goroutine 用于执行并发任务，channel 用于 goroutine 之间的同步、通信。

### 2.1. channel和mutex
> Do not communicate by sharing memory; instead, share memory by communicating.
前面半句说的是通过 sync 包里的一些组件进行并发编程；而后面半句则是说 Go 推荐使用 channel 进行并发编程。
本质上channel 的底层就是通过 mutex 来控制并发的。只是 channel 是更高一层次的并发编程原语，封装了更多的功能


## 3. channel的使用

### 3.1. 声明

```go
//chan T // 声明一个双向通道
//chan<- T // 声明一个只能用于发送的通道
//<-chan T // 声明一个只能用于接收的通道

func TestChannel4(t *testing.T) {
	receiveChannel := make(<-chan int)
	sendChannel := make(chan<- int)
	channel := make(chan int)
	fmt.Println(receiveChannel, sendChannel, channel)

}

//输出
0xc00004a2a0 0xc00004a300 0xc00004a360
//可以看出make 返回的channel是个引用
```

### 3.2. 创建

```go
func TestChannel1(t *testing.T) {
	//无缓冲
	//可以看成同步模式。必须要使发送方和接收方配对，操作才会成功，否则会被阻塞；
	ints := make(chan int)
	//有缓冲
	//可以看成异步模式。缓冲槽要有剩余容量，操作才会成功，否则也会被阻塞
	ints2 := make(chan int, 10)
	fmt.Println(ints, ints2)

}

//输出
0xc00004a2a0 0xc0000b6000
```
### 3.3. 收发

```go
func goroutineA(a <-chan int) {
	val := <-a
	fmt.Println("G1 received data: ", val)
	return
}

func goroutineB(b <-chan int) {
	val := <-b
	fmt.Println("G2 received data: ", val)
	return
}

func TestChannel2(t *testing.T) {
	ch := make(chan int)
	go goroutineA(ch)
	go goroutineB(ch)
	ch <- 3
	time.Sleep(time.Second)
}
//输出
G2 received data:  3
```

### 3.4. 关闭

```go
func TestChannel3(t *testing.T) {
	ch := make(chan int)
	go goroutineC(ch)
	time.Sleep(time.Second)
	close(ch)
	time.Sleep(time.Second)
}

func goroutineC(ch chan int) {
	data, ok := <-ch
	if !ok {
		fmt.Println("chanenl关闭，data：", data)
		return
	}

	fmt.Println(data)
}

//输出
chanenl关闭，data： 0
```

#### 3.4.1. 如何优雅的关闭channel
原则：不要从一个 receiver 侧关闭 channel，也不要在有多个 sender 时，关闭 channel
根据 sender 和 receiver 的个数，分下面几种情况：

|       | sender | receiver | 处理 |
| ----- | ------ | -------- | ---- |
| 情况1 | 1      | 1        |   从 sender 端关闭  |
| 情况2 | 1      | N        |  从 sender 端关闭    |
| 情况3 | N      | 1        |    增加一个传递关闭信号的 channel，receiver 通过信号 channel 下达关闭数据 channel 指令。senders 监听到关闭信号后，停止发送数据  |
| 情况4 | N      | M        |   需要增加一个中间人，M 个 receiver 都向它发送关闭 dataCh 的“请求”，中间人收到第一个请求后，就会直接下达关闭 dataCh 的指令   |

- 1 ：1

```go
func TestClose1(t *testing.T) {
	rand.Seed(time.Now().UnixNano())

	const Max = 100000

	dataCh := make(chan int, 100)
	stopCh := make(chan struct{})

	// the sender
	go func() {
		for {
			value := rand.Intn(Max)
			if value == Max-1 {
				fmt.Println("send stop signal to receiver.")
				close(stopCh)
				return
			}
			dataCh <- value
		}
	}()

	// the receiver
	go func() {
		for {
			select {
			case value := <-dataCh:
				fmt.Println(value)
			case <-stopCh:
				return
			}
		}
	}()

	select {
	case <-time.After(time.Hour):
	}
}
```

- 1 ：N

```go
func TestClose2(t *testing.T) {
	rand.Seed(time.Now().UnixNano())

	const Max = 100000
	const NumReceivers = 10

	dataCh := make(chan int, 100)
	stopCh := make(chan struct{})

	// the sender
	go func() {
		for {
			value := rand.Intn(Max)
			if value == Max-1 {
				fmt.Println("send stop signal to receiver.")
				close(stopCh)
				return
			}
			dataCh <- value
		}
	}()

	// the receivers
	for i := 0; i < NumReceivers; i++ {
		go func(id string) {
			for {
				select {
				case value := <-dataCh:
					fmt.Println(value)
				case <-stopCh:
					fmt.Println("receiver ", id , " return.")
					return
				}
			}
		}(strconv.Itoa(i))
	}

	select {
	case <-time.After(time.Hour):
	}
}

```
- N ：1

```go
func TestClose3(t *testing.T) {
	rand.Seed(time.Now().UnixNano())

	const Max = 100000
	const NumSenders = 1000

	dataCh := make(chan int, 100)
	stopCh := make(chan struct{})

	// senders
	for i := 0; i < NumSenders; i++ {
		go func() {
			for {
				select {
				case <-stopCh:
					return
				case dataCh <- rand.Intn(Max):
				}
			}
		}()
	}

	// the receiver
	go func() {
		for value := range dataCh {
			if value == Max-1 {
				fmt.Println("send stop signal to senders.")
				close(stopCh)
				return
			}

			fmt.Println(value)
		}
	}()

	select {
	case <-time.After(time.Hour):
	}

}

```

- N ：M

```go
func TestClose4(t *testing.T) {
	rand.Seed(time.Now().UnixNano())

	const Max = 100000
	const NumReceivers = 10
	const NumSenders = 1000

	dataCh := make(chan int, 100)
	stopCh := make(chan struct{})

	// It must be a buffered channel.
	toStop := make(chan string, 1)

	var stoppedBy string

	// moderator
	go func() {
		stoppedBy = <-toStop
		fmt.Println(stoppedBy)
		close(stopCh)
	}()

	// senders
	for i := 0; i < NumSenders; i++ {
		go func(id string) {
			for {
				value := rand.Intn(Max)
				if value == 0 {
					select {
					case toStop <- "sender#" + id:
					default:
					}
					return
				}

				select {
				case <-stopCh:
					return
				case dataCh <- value:
				}
			}
		}(strconv.Itoa(i))
	}

	// receivers
	for i := 0; i < NumReceivers; i++ {
		go func(id string) {
			for {
				select {
				case <-stopCh:
					return
				case value := <-dataCh:
					if value == Max-1 {
						select {
						case toStop <- "receiver#" + id:
						default:
						}
						return
					}

					fmt.Println(value)
				}
			}
		}(strconv.Itoa(i))
	}

	select {
	case <-time.After(time.Hour):
	}

}

```
### 3.5. buffer满或定时上报
```go
type Data struct {
	topic int
}

func (d *Data) String() string {
	return fmt.Sprintf("%v", d.topic)
}

const bufferSize = 2

func TestChannel3(t *testing.T) {
	Queue := make(chan *Data, 1000)
	go func() {
		buffers := make([]*Data, 0, bufferSize)
		for {
			select {
			case data := <-Queue:
				buffers = append(buffers, data)
				if len(buffers) == bufferSize {
					fmt.Println("==========buffer满了============")
					batchDealData(&buffers)
				}
			case <-time.After(time.Second * 5):
				fmt.Println("=========定时上报=============")
				batchDealData(&buffers)
			}
		}
	}()

	for i := 0; i < 100; i++ {
		Queue <- &Data{topic: i}
	}
	time.Sleep(time.Hour)
}

func batchDealData(buffers *[]*Data) {
	fmt.Println("处理data：", len(*buffers), buffers)
	*buffers = nil
}

```
## 4. happens before
[concurrent.md](concurrent.md)
## 5. 原理
### 5.1. 数据结构
可以看出channel是通过循环数组+双向链表+锁实现的
```go
type hchan struct {
	// chan 里元素数量
	qcount   uint
	// chan 底层循环数组的长度
	dataqsiz uint
	// 底层使用循环数组实现，这里式指向循环数组的指针
	// 只针对有缓冲的 channel
	buf      unsafe.Pointer
	// chan 中元素大小
	elemsize uint16
	// chan 是否被关闭的标志
	closed   uint32
	// chan 中元素类型
	elemtype *_type // element type
	// 已发送元素在循环数组中的索引
	sendx    uint   // send index
	// 已接收元素在循环数组中的索引	recvx    uint   // receive index
	// 等待接收的 goroutine 队列，即（<-chan）
	recvq    waitq  // list of recv waiters
	// 等待发送的 goroutine 队列，即（chan<-）

	sendq    waitq  // list of send waiters

	// 保护 hchan 中所有字段
	lock mutex
}

//sudog的双向链表
type waitq struct {
	first *sudog//sudog是对channel的封装
	last  *sudog
}
```
创建一个容量为 6 的，元素为 int 型的 channel 数据结构如下 
![](https://raw.githubusercontent.com/TDoct/images/master/1597580512_20200816200030425_20925.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1599920258_20200912173959585_27561.png)
### 5.2. 创建channel

```go
func TestChannel12(t *testing.T) {
	ints := make(chan int)
	fmt.Println(ints)
}
```

- go tool compile -S
```go
0x0028 00040 (channel2_test.go:9)	PCDATA	$0, $1
0x0028 00040 (channel2_test.go:9)	PCDATA	$1, $0
0x0028 00040 (channel2_test.go:9)	LEAQ	type.chan int(SB), AX
0x002f 00047 (channel2_test.go:9)	PCDATA	$0, $0
0x002f 00047 (channel2_test.go:9)	MOVQ	AX, (SP)
0x0033 00051 (channel2_test.go:9)	MOVQ	$0, 8(SP)
0x003c 00060 (channel2_test.go:9)	CALL	runtime.makechan(SB)
0x0041 00065 (channel2_test.go:9)	PCDATA	$0, $1
0x0041 00065 (channel2_test.go:9)	MOVQ	16(SP), AX
```

会调用`runtime.makechan(SB)`

```go
const hchanSize = unsafe.Sizeof(hchan{}) + uintptr(-int(unsafe.Sizeof(hchan{}))&(maxAlign-1))

//返回的是一个hchan指针
func makechan(t *chantype, size int64) *hchan {
	elem := t.elem

	// 省略了检查 channel size，align 的代码
	// ……

	var c *hchan
	// 如果元素类型不含指针 或者 size 大小为 0（无缓冲类型）
	// 只进行一次内存分配
	if elem.kind&kindNoPointers != 0 || size == 0 {
		// 如果 hchan 结构体中不含指针，GC 就不会扫描 chan 中的元素
		// 只分配 "hchan 结构体大小 + 元素大小*个数" 的内存
		c = (*hchan)(mallocgc(hchanSize+uintptr(size)*elem.size, nil, true))
		// 如果是缓冲型 channel 且元素大小不等于 0（大小等于 0的元素类型：struct{}）
		if size > 0 && elem.size != 0 {
			c.buf = add(unsafe.Pointer(c), hchanSize)
		} else {
			// race detector uses this location for synchronization
			// Also prevents us from pointing beyond the allocation (see issue 9401).
			// 1. 非缓冲型的，buf 没用，直接指向 chan 起始地址处
			// 2. 缓冲型的，能进入到这里，说明元素无指针且元素类型为 struct{}，也无影响
			// 因为只会用到接收和发送游标，不会真正拷贝东西到 c.buf 处（这会覆盖 chan的内容）
			c.buf = unsafe.Pointer(c)
		}
	} else {
		// 进行两次内存分配操作
		c = new(hchan)
		c.buf = newarray(elem, int(size))
	}
	c.elemsize = uint16(elem.size)
	c.elemtype = elem
	// 循环数组长度
	c.dataqsiz = uint(size)

	// 返回 hchan 指针
	return c
}

```

![](https://raw.githubusercontent.com/TDoct/images/master/1597580515_20200816201207732_16735.png)

- 创建buffered channel
![](https://raw.githubusercontent.com/TDoct/images/master/1599920262_20200912174337222_19270.png)

- 创建unbuffered channel
![](https://raw.githubusercontent.com/TDoct/images/master/1599920266_20200912174358169_6631.png)
### 5.3. 接收channel

```go
func TestChannel13(t *testing.T) {
	ints := make(chan int)
	go func() {
		data := <-ints
		fmt.Println(data)
	}()
	go func() {
		data, ok := <-ints
		fmt.Println(ok, data)
	}()
	ints <- 10
	time.Sleep(time.Hour)
}

```

- go tool compile -S

```asm
0x0028 00040 (channel2_test.go:12)	PCDATA	$0, $0
0x0028 00040 (channel2_test.go:12)	PCDATA	$1, $0
0x0028 00040 (channel2_test.go:12)	MOVQ	$0, ""..autotmp_8+64(SP)
0x0031 00049 (channel2_test.go:12)	PCDATA	$0, $1
0x0031 00049 (channel2_test.go:12)	PCDATA	$1, $1
0x0031 00049 (channel2_test.go:12)	MOVQ	"".ints+104(SP), AX
0x0036 00054 (channel2_test.go:12)	PCDATA	$0, $0
0x0036 00054 (channel2_test.go:12)	MOVQ	AX, (SP)
0x003a 00058 (channel2_test.go:12)	PCDATA	$0, $1
0x003a 00058 (channel2_test.go:12)	LEAQ	""..autotmp_8+64(SP), AX
0x003f 00063 (channel2_test.go:12)	PCDATA	$0, $0
0x003f 00063 (channel2_test.go:12)	MOVQ	AX, 8(SP)
0x0044 00068 (channel2_test.go:12)	CALL	runtime.chanrecv1(SB)
0x0049 00073 (channel2_test.go:12)	MOVQ	""..autotmp_8+64(SP), AX

0x0028 00040 (channel2_test.go:16)	PCDATA	$0, $1
0x0028 00040 (channel2_test.go:16)	PCDATA	$1, $1
0x0028 00040 (channel2_test.go:16)	MOVQ	"".ints+128(SP), AX
0x0030 00048 (channel2_test.go:16)	PCDATA	$0, $0
0x0030 00048 (channel2_test.go:16)	MOVQ	AX, (SP)
0x0034 00052 (channel2_test.go:16)	PCDATA	$0, $1
0x0034 00052 (channel2_test.go:16)	LEAQ	""..autotmp_10+72(SP), AX
0x0039 00057 (channel2_test.go:16)	PCDATA	$0, $0
0x0039 00057 (channel2_test.go:16)	MOVQ	AX, 8(SP)
0x003e 00062 (channel2_test.go:16)	CALL	runtime.chanrecv2(SB)
0x0043 00067 (channel2_test.go:16)	MOVQ	""..autotmp_10+72(SP), AX
0x0048 00072 (channel2_test.go:16)	MOVBLZX	16(SP), CX
	0x004d 00077 (channel2_test.go:16)	MOVQ	CX, ""..autotmp_26+64(SP)
```
会调用`runtime.chanrecv1(SB)`和`runtime.chanrecv2(SB)`

```go
// 处理不带 "ok" 的情形
func chanrecv1(c *hchan, elem unsafe.Pointer) {
	chanrecv(c, elem, true)
}

//处理带“ok”的情形。通过返回 "received" 这个字段来反应 channel 是否被关闭
func chanrecv2(c *hchan, elem unsafe.Pointer) (received bool) {
	_, received = chanrecv(c, elem, true)
	return
}

```

最终调用chanrecv
```go
// 位于 src/runtime/chan.go

// chanrecv 函数接收 channel c 的元素并将其写入 ep 所指向的内存地址。
// 如果 ep 是 nil，说明忽略了接收值。
// 如果 block == false，即非阻塞型接收，在没有数据可接收的情况下，返回 (false, false)
// 否则，如果 c 处于关闭状态，将 ep 指向的地址清零，返回 (true, false)
// 否则，用返回值填充 ep 指向的内存地址。返回 (true, true)
// 如果 ep 非空，则应该指向堆或者函数调用者的栈

func chanrecv(c *hchan, ep unsafe.Pointer, block bool) (selected, received bool) {
	// 省略 debug 内容 …………

	// 如果是一个 nil 的 channel
	if c == nil {
		// 如果不阻塞，直接返回 (false, false)
		if !block {
			return
		}
		// 否则，接收一个 nil 的 channel，goroutine 挂起
		gopark(nil, nil, "chan receive (nil chan)", traceEvGoStop, 2)
		// 不会执行到这里
		throw("unreachable")
	}

	// 在非阻塞模式下，快速检测到失败，不用获取锁，快速返回
	// 当我们观察到 channel 没准备好接收：
	// 1. 非缓冲型，等待发送列队 sendq 里没有 goroutine 在等待
	// 2. 缓冲型，但 buf 里没有元素
	// 之后，又观察到 closed == 0，即 channel 未关闭。
	// 因为 channel 不可能被重复打开，所以前一个观测的时候 channel 也是未关闭的，
	// 因此在这种情况下可以直接宣布接收失败，返回 (false, false)
	if !block && (c.dataqsiz == 0 && c.sendq.first == nil ||
		c.dataqsiz > 0 && atomic.Loaduint(&c.qcount) == 0) &&
		atomic.Load(&c.closed) == 0 {
		return
	}

	var t0 int64
	if blockprofilerate > 0 {
		t0 = cputicks()
	}

	// 加锁
	lock(&c.lock)

	// channel 已关闭，并且循环数组 buf 里没有元素
	// 这里可以处理非缓冲型关闭 和 缓冲型关闭但 buf 无元素的情况
	// 也就是说即使是关闭状态，但在缓冲型的 channel，
	// buf 里有元素的情况下还能接收到元素
	if c.closed != 0 && c.qcount == 0 {
		if raceenabled {
			raceacquire(unsafe.Pointer(c))
		}
		// 解锁
		unlock(&c.lock)
		if ep != nil {
			// 从一个已关闭的 channel 执行接收操作，且未忽略返回值
			// 那么接收的值将是一个该类型的零值
			// typedmemclr 根据类型清理相应地址的内存
			typedmemclr(c.elemtype, ep)
		}
		// 从一个已关闭的 channel 接收，selected 会返回true
		return true, false
	}

	// 等待发送队列里有 goroutine 存在，说明 buf 是满的
	// 这有可能是：
	// 1. 非缓冲型的 channel
	// 2. 缓冲型的 channel，但 buf 满了
	// 针对 1，直接进行内存拷贝（从 sender goroutine -> receiver goroutine）
	// 针对 2，接收到循环数组头部的元素，并将发送者的元素放到循环数组尾部
	if sg := c.sendq.dequeue(); sg != nil {
		// Found a waiting sender. If buffer is size 0, receive value
		// directly from sender. Otherwise, receive from head of queue
		// and add sender's value to the tail of the queue (both map to
		// the same buffer slot because the queue is full).
		recv(c, sg, ep, func() { unlock(&c.lock) }, 3)
		return true, true
	}

	// 缓冲型，buf 里有元素，可以正常接收
	if c.qcount > 0 {
		// 直接从循环数组里找到要接收的元素
		qp := chanbuf(c, c.recvx)

		// …………

		// 代码里，没有忽略要接收的值，不是 "<- ch"，而是 "val <- ch"，ep 指向 val
		if ep != nil {
			typedmemmove(c.elemtype, ep, qp)
		}
		// 清理掉循环数组里相应位置的值
		typedmemclr(c.elemtype, qp)
		// 接收游标向前移动
		c.recvx++
		// 接收游标归零
		if c.recvx == c.dataqsiz {
			c.recvx = 0
		}
		// buf 数组里的元素个数减 1
		c.qcount--
		// 解锁
		unlock(&c.lock)
		return true, true
	}

	if !block {
		// 非阻塞接收，解锁。selected 返回 false，因为没有接收到值
		unlock(&c.lock)
		return false, false
	}

	// 接下来就是要被阻塞的情况了
	// 构造一个 sudog
	gp := getg()
	mysg := acquireSudog()
	mysg.releasetime = 0
	if t0 != 0 {
		mysg.releasetime = -1
	}

	// 待接收数据的地址保存下来
	mysg.elem = ep
	mysg.waitlink = nil
	gp.waiting = mysg
	mysg.g = gp
	mysg.selectdone = nil
	mysg.c = c
	gp.param = nil
	// 进入channel 的等待接收队列
	c.recvq.enqueue(mysg)
	// 将当前 goroutine 挂起
	goparkunlock(&c.lock, "chan receive", traceEvGoBlockRecv, 3)

	// 被唤醒了，接着从这里继续执行一些扫尾工作
	if mysg != gp.waiting {
		throw("G waiting list is corrupted")
	}
	gp.waiting = nil
	if mysg.releasetime > 0 {
		blockevent(mysg.releasetime-t0, 2)
	}
	closed := gp.param == nil
	gp.param = nil
	mysg.c = nil
	releaseSudog(mysg)
	return true, !closed
}

```

- 从buffered channel接收数据
![](https://raw.githubusercontent.com/TDoct/images/master/1599920273_20200912174610329_14398.png)
    - 如果channel为空
![](https://raw.githubusercontent.com/TDoct/images/master/1599920283_20200912175010499_3840.png)
    - 之后来了一个新的发送方
![](https://raw.githubusercontent.com/TDoct/images/master/1599920287_20200912175051278_13084.png)

### 5.4. 发送channel


```go
func TestChannel13(t *testing.T) {
	ints := make(chan int)
	go func() {
		data := <-ints
		fmt.Println(data)
	}()
	ints <- 10
	time.Sleep(time.Hour)
}

```

- go tool compile -S
```asm
0x0063 00099 (channel2_test.go:15)	PCDATA	$0, $1
0x0063 00099 (channel2_test.go:15)	PCDATA	$1, $0
0x0063 00099 (channel2_test.go:15)	MOVQ	"".ints+24(SP), AX
0x0068 00104 (channel2_test.go:15)	PCDATA	$0, $0
0x0068 00104 (channel2_test.go:15)	MOVQ	AX, (SP)
0x006c 00108 (channel2_test.go:15)	PCDATA	$0, $1
0x006c 00108 (channel2_test.go:15)	LEAQ	""..stmp_0(SB), AX
0x0073 00115 (channel2_test.go:15)	PCDATA	$0, $0
0x0073 00115 (channel2_test.go:15)	MOVQ	AX, 8(SP)
0x0078 00120 (channel2_test.go:15)	CALL	runtime.chansend1(SB)
```
会调用`runtime.chansend1(SB)`

```go
// 位于 src/runtime/chan.go

func chansend(c *hchan, ep unsafe.Pointer, block bool, callerpc uintptr) bool {
	// 如果 channel 是 nil
	if c == nil {
		// 不能阻塞，直接返回 false，表示未发送成功
		if !block {
			return false
		}
		// 当前 goroutine 被挂起
		gopark(nil, nil, "chan send (nil chan)", traceEvGoStop, 2)
		throw("unreachable")
	}

	// 省略 debug 相关……

	// 对于不阻塞的 send，快速检测失败场景
	//
	// 如果 channel 未关闭且 channel 没有多余的缓冲空间。这可能是：
	// 1. channel 是非缓冲型的，且等待接收队列里没有 goroutine
	// 2. channel 是缓冲型的，但循环数组已经装满了元素
	if !block && c.closed == 0 && ((c.dataqsiz == 0 && c.recvq.first == nil) ||
		(c.dataqsiz > 0 && c.qcount == c.dataqsiz)) {
		return false
	}

	var t0 int64
	if blockprofilerate > 0 {
		t0 = cputicks()
	}

	// 锁住 channel，并发安全
	lock(&c.lock)

	// 如果 channel 关闭了
	if c.closed != 0 {
		// 解锁
		unlock(&c.lock)
		// 直接 panic
		panic(plainError("send on closed channel"))
	}

	// 如果接收队列里有 goroutine，直接将要发送的数据拷贝到接收 goroutine
	if sg := c.recvq.dequeue(); sg != nil {
		send(c, sg, ep, func() { unlock(&c.lock) }, 3)
		return true
	}

	// 对于缓冲型的 channel，如果还有缓冲空间
	if c.qcount < c.dataqsiz {
		// qp 指向 buf 的 sendx 位置
		qp := chanbuf(c, c.sendx)

		// ……

		// 将数据从 ep 处拷贝到 qp
		typedmemmove(c.elemtype, qp, ep)
		// 发送游标值加 1
		c.sendx++
		// 如果发送游标值等于容量值，游标值归 0
		if c.sendx == c.dataqsiz {
			c.sendx = 0
		}
		// 缓冲区的元素数量加一
		c.qcount++

		// 解锁
		unlock(&c.lock)
		return true
	}

	// 如果不需要阻塞，则直接返回错误
	if !block {
		unlock(&c.lock)
		return false
	}

	// channel 满了，发送方会被阻塞。接下来会构造一个 sudog

	// 获取当前 goroutine 的指针
	gp := getg()
	mysg := acquireSudog()
	mysg.releasetime = 0
	if t0 != 0 {
		mysg.releasetime = -1
	}

	mysg.elem = ep
	mysg.waitlink = nil
	mysg.g = gp
	mysg.selectdone = nil
	mysg.c = c
	gp.waiting = mysg
	gp.param = nil

	// 当前 goroutine 进入发送等待队列
	c.sendq.enqueue(mysg)

	// 当前 goroutine 被挂起
	goparkunlock(&c.lock, "chan send", traceEvGoBlockSend, 3)

	// 从这里开始被唤醒了（channel 有机会可以发送了）
	if mysg != gp.waiting {
		throw("G waiting list is corrupted")
	}
	gp.waiting = nil
	if gp.param == nil {
		if c.closed == 0 {
			throw("chansend: spurious wakeup")
		}
		// 被唤醒后，channel 关闭了。坑爹啊，panic
		panic(plainError("send on closed channel"))
	}
	gp.param = nil
	if mysg.releasetime > 0 {
		blockevent(mysg.releasetime-t0, 2)
	}
	// 去掉 mysg 上绑定的 channel
	mysg.c = nil
	releaseSudog(mysg)
	return true
}

```

- 向buffered channel发送数据
![](https://raw.githubusercontent.com/TDoct/images/master/1599920269_20200912174502937_29193.png)
    - 如果channel已经满了
![](https://raw.githubusercontent.com/TDoct/images/master/1599920277_20200912174818296_27070.png)
    - 之后来了一个接收方
![](https://raw.githubusercontent.com/TDoct/images/master/1599920280_20200912174912622_14613.png)
- 向unbuffered channel发送数据

### 5.5. 关闭channel

```go
func TestChannel13(t *testing.T) {
	ints := make(chan int)
	go func() {
		data := <-ints
		fmt.Println(data)
	}()
	time.Sleep(time.Second)
	close(ints)
}
```

- go tool compile -S

```asm
0x006c 00108 (channel2_test.go:16)	PCDATA	$0, $1
0x006c 00108 (channel2_test.go:16)	PCDATA	$1, $0
0x006c 00108 (channel2_test.go:16)	MOVQ	"".ints+24(SP), AX
0x0071 00113 (channel2_test.go:16)	PCDATA	$0, $0
0x0071 00113 (channel2_test.go:16)	MOVQ	AX, (SP)
0x0075 00117 (channel2_test.go:16)	CALL	runtime.closechan(SB)
```

会调用`runtime.closechan(SB)`

```go
func closechan(c *hchan) {
	// 关闭一个 nil channel，panic
	if c == nil {
		panic(plainError("close of nil channel"))
	}

	// 上锁
	lock(&c.lock)
	// 如果 channel 已经关闭
	if c.closed != 0 {
		unlock(&c.lock)
		// panic
		panic(plainError("close of closed channel"))
	}

	// …………

	// 修改关闭状态
	c.closed = 1

	var glist *g

	// 将 channel 所有等待接收队列的里 sudog 释放
	for {
		// 从接收队列里出队一个 sudog
		sg := c.recvq.dequeue()
		// 出队完毕，跳出循环
		if sg == nil {
			break
		}

		// 如果 elem 不为空，说明此 receiver 未忽略接收数据
		// 给它赋一个相应类型的零值
		if sg.elem != nil {
			typedmemclr(c.elemtype, sg.elem)
			sg.elem = nil
		}
		if sg.releasetime != 0 {
			sg.releasetime = cputicks()
		}
		// 取出 goroutine
		gp := sg.g
		gp.param = nil
		if raceenabled {
			raceacquireg(gp, unsafe.Pointer(c))
		}
		// 相连，形成链表
		gp.schedlink.set(glist)
		glist = gp
	}

	// 将 channel 等待发送队列里的 sudog 释放
	// 如果存在，这些 goroutine 将会 panic
	for {
		// 从发送队列里出队一个 sudog
		sg := c.sendq.dequeue()
		if sg == nil {
			break
		}

		// 发送者会 panic
		sg.elem = nil
		if sg.releasetime != 0 {
			sg.releasetime = cputicks()
		}
		gp := sg.g
		gp.param = nil
		if raceenabled {
			raceacquireg(gp, unsafe.Pointer(c))
		}
		// 形成链表
		gp.schedlink.set(glist)
		glist = gp
	}
	// 解锁
	unlock(&c.lock)

	// Ready all Gs now that we've dropped the channel lock.
	// 遍历链表
	for glist != nil {
		// 取最后一个
		gp := glist
		// 向前走一步，下一个唤醒的 g
		glist = glist.schedlink.ptr()
		gp.schedlink = 0
		// 唤醒相应 goroutine
		goready(gp, 3)
	}
}

```

- 关闭channel
![](https://raw.githubusercontent.com/TDoct/images/master/1599920291_20200912190550073_16415.png)
    - 读取一个已关闭的channel
![](https://raw.githubusercontent.com/TDoct/images/master/1599920294_20200912190659756_11330.png)

## 6. 参考
- [深度解密Go语言之channel \- 掘金](https://juejin.im/post/6844903894334570504)