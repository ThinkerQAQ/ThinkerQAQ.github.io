## 1. 是什么
- 类似于IO多路复用
    - 监听多个阻塞的事件，如果事件发生了，那么执行该事件逻辑
    - 如果没有发生并有默认的事件，那么执行默认的事件逻辑
    - 如果没有发生且没有默认的事件，那么一直阻塞
## 2. 使用

### 2.1. 基本使用

```go
select {
case v1 := <-c1: //receive操作
    fmt.Printf("received %v from c1\n", v1)
case v2 := <-c2: //receive操作
    fmt.Printf("received %v from c2\n", v1)
case c3 <- 23: //send操作
    fmt.Printf("sent %v to c3\n", 23)
default: //默认
    fmt.Printf("no one was ready to communicate\n")
}
```
代码执行到 select 时，case 语句会按照源代码的顺序被评估，且**只评估一次**，评估的结果会出现下面这几种情况：

1. 除 default 外，如果只有一个 case 语句评估通过，那么就执行这个case里的语句；
2. 除 default 外，如果有多个 case 语句评估通过，那么通过伪随机的方式随机选一个；
3. 如果 default 外的 case 语句都没有通过评估，那么执行 default 里的语句；
4. 如果没有 default，那么 代码块会被阻塞，直到有一个 case 通过评估；否则一直阻塞
### 2.2. 随机性

```go
func TestSelect6(t *testing.T) {
	output1 := make(chan string)
	output2 := make(chan string)
	go server1(output1)
	go server2(output2)
	time.Sleep(time.Second)
	select {
	case s1 := <-output1:
		fmt.Println(s1)
	case s2 := <-output2:
		fmt.Println(s2)
	}
}

func server1(ch chan string) {
	ch <- "from server1"
}
func server2(ch chan string) {
	ch <- "from server2"

}

//输出
有时候输出
from server2
有时候输出
from server1
```

### 2.3. select{} 永远阻塞

```go
func TestSelect2(t *testing.T) {
	go func() {
		fmt.Println("aaaaaaaaaaa")
	}()
	select {}
}
//输出
aaaaaaaaaaa
fatal error: all goroutines are asleep - deadlock!
```

### 2.4. nil channel永久阻塞
```go
func TestSelect5(t *testing.T) {
	var ch chan string
	select {
	case v := <-ch: //nil channel永久阻塞
		fmt.Println("received value", v)
	}

}
//输出
fatal error: all goroutines are asleep - deadlock!
```
### 2.5. 跳出for-select 循环
使用return或者goto

```go
func TestSelect3(t *testing.T) {
	ch1 := make(chan int)
	ch2 := make(chan int)

	go func() {
		time.Sleep(time.Second * 5)
		ch1 <- 1
	}()

	go func() {
		time.Sleep(time.Second * 10)
		ch2 <- 2
	}()
	for {
		select {
		case data := <-ch1:
			fmt.Println(data)
			break//break仅能退出select，不能退出for
		case data := <-ch2:
			fmt.Println(data)
			goto TAG//可以使用goto或者return
		}

		fmt.Println("exit select")
	}

TAG:
	fmt.Println("exit for")

}
//输出
1
exit select
2
exit for
```

### 2.6. 为请求设置超时时间

```go
func main() {
	c := requestBaidu()
	timeout := time.After(5 * time.Second)
	for {
		select {
		case s := <-c:
			fmt.Println(s)
		case <-timeout:
			fmt.Println("请求超时.")
			return
		}
	}
}

func requestBaidu() chan int {
	return make(chan int)
}

//输出
请求超时.
```


### 2.7. quit channel

```go
func TestSelect4(t *testing.T) {
	quit := make(chan int)
	data := make(chan int)

	go func() {
		for {
			select {
			case d := <-data:
				fmt.Println("收到数据：", d)
			case <-quit:
				fmt.Println("退出")
				return
			}
		}

	}()

	for i := 0; i < 10; i++ {
		data <- i
	}
	quit <- 3

	time.Sleep(time.Minute)
}
```

## 3. 原理
### 3.1. select{}

```go
func TestSelect(t *testing.T) {
	select {}
}

```
- go tool compile -S select1_test.go

```asm
0x0000 00000 (select2_test.go:5)        TEXT    "".TestSelect(SB), ABIInternal, $8-8
0x0000 00000 (select2_test.go:5)        MOVQ    TLS, CX
0x0009 00009 (select2_test.go:5)        MOVQ    (CX)(TLS*2), CX
0x0010 00016 (select2_test.go:5)        CMPQ    SP, 16(CX)
0x0014 00020 (select2_test.go:5)        JLS     40
0x0016 00022 (select2_test.go:5)        SUBQ    $8, SP
0x001a 00026 (select2_test.go:5)        MOVQ    BP, (SP)
0x001e 00030 (select2_test.go:5)        LEAQ    (SP), BP
0x0022 00034 (select2_test.go:5)        FUNCDATA        $0, gclocals·2a5305abe05176240e61b8620e19a815(SB)
0x0022 00034 (select2_test.go:5)        FUNCDATA        $1, gclocals·33cdeccccebe80329f1fdbee7f5874cb(SB)
0x0022 00034 (select2_test.go:5)        FUNCDATA        $2, gclocals·33cdeccccebe80329f1fdbee7f5874cb(SB)
0x0022 00034 (select2_test.go:6)        PCDATA  $0, $0
0x0022 00034 (select2_test.go:6)        PCDATA  $1, $0
0x0022 00034 (select2_test.go:6)        CALL    runtime.block(SB)
0x0027 00039 (select2_test.go:6)        XCHGL   AX, AX
0x0028 00040 (select2_test.go:6)        NOP
0x0028 00040 (select2_test.go:5)        PCDATA  $1, $-1
0x0028 00040 (select2_test.go:5)        PCDATA  $0, $-1
0x0028 00040 (select2_test.go:5)        CALL    runtime.morestack_noctxt(SB)
0x002d 00045 (select2_test.go:5)        JMP     0
```
可以看出调用的是`CALL runtime.block(SB)`
### 3.2. 一个case

```go
select {
    case v <- ch:
        //...
}

//翻译为
if v <- ch {
    //...
}
```
### 3.3. 一个case+default

```go
select {
    case v <- ch:
        //...
    default:
        //...
}

//翻译为
if v <- ch {
    //...
} else {
    //...
}
```

### 3.4. 多个case
```go
func TestSelect4(t *testing.T) {
	quit := make(chan int)
	data := make(chan int)

	go func() {
		for {
			select {
			case d := <-data:
				fmt.Println("收到数据：", d)
			case <-quit:
				fmt.Println("退出")
				return
			}
		}

	}()

	for i := 0; i < 10; i++ {
		data <- i
	}
	quit <- 3

	time.Sleep(time.Minute)
}
```

- go tool compile -S select1_test.go
```asm
0x0128 00296 (select1_test.go:15)	PCDATA	$0, $8
0x0128 00296 (select1_test.go:15)	PCDATA	$1, $0
0x0128 00296 (select1_test.go:15)	LEAQ	""..autotmp_19+128(SP), DX
0x0130 00304 (select1_test.go:15)	PCDATA	$0, $0
0x0130 00304 (select1_test.go:15)	MOVQ	DX, (SP)
0x0134 00308 (select1_test.go:15)	PCDATA	$0, $8
0x0134 00308 (select1_test.go:15)	LEAQ	""..autotmp_20+64(SP), DX
0x0139 00313 (select1_test.go:15)	PCDATA	$0, $0
0x0139 00313 (select1_test.go:15)	MOVQ	DX, 8(SP)
0x013e 00318 (select1_test.go:15)	MOVQ	$2, 16(SP)
0x0147 00327 (select1_test.go:15)	CALL	runtime.selectgo(SB)
0x014c 00332 (select1_test.go:15)	MOVQ	24(SP), AX
```
调用的是`runtime.selectgo(SB)`
## 4. 参考
- [golang 之select 的高级用法 \- 掘金](https://juejin.im/post/6844903829935226894)
- [Go语言并发模型：使用 select \- 赵帅虎 \- SegmentFault 思否](https://segmentfault.com/a/1190000006815341)
- [\[译\] part24: golang select \- 掘金](https://juejin.im/post/6844903812344315918)