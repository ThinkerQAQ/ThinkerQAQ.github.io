
## 1. goroutine是什么
- [程序、进程、线程.md](../Operating_System/进程管理/程序、进程、线程.md)
- Go语言实现的用户线程
- 相比较于线程，goroutine
    - 创建、销毁和切换：都在用户态完成无需进入内核
    - 内存占用：默认栈大小为2K，并且可以动态扩缩容

## 2. goroutine使用

### 2.1. 创建协程
```go
func TestGoroutine1(t *testing.T) {
	go func(x, y, z int) {
		time.Sleep(time.Second * 1)
		fmt.Println(x + y + z)
	}(1, 2, 3)
	time.Sleep(time.Minute * 5)

}

```

- `go f(x, y, z)`会启动一个新的goroutine运行函数`f(x, y, z)`
    - 函数f，变量x、y、z的值是在原goroutine计算的，只有函数f的执行是在新的goroutine中的
    - 新的goroutine会创建一个新栈

### 2.2. 协程池
[协程池.md](协程池.md)
## 3. goroutine原理
```go
func TestGoroutine1(t *testing.T) {
	go func(x, y, z int) {
		time.Sleep(time.Second * 1)
		fmt.Println(x + y + z)
	}(1, 2, 3)
	time.Sleep(time.Minute * 5)

}

```

- go tool compile -S 
goroutine函数调用`go f(1, 2, 3)`

```go
0x0024 00036 (goroutine1_test.go:10)	PCDATA	$0, $0
0x0024 00036 (goroutine1_test.go:10)	 PCDATA	$1, $0
0x0024 00036 (goroutine1_test.go:10)	MOVL	$24, (SP)
0x002b 00043 (goroutine1_test.go:10)	PCDATA	$0, $1
0x002b 00043 (goroutine1_test.go:10)	LEAQ	"".TestGoroutine1.func1·f(SB), AX
0x0032 00050 (goroutine1_test.go:10)	PCDATA	$0, $0
0x0032 00050 (goroutine1_test.go:10)	MOVQ	AX, 8(SP)
0x0037 00055 (goroutine1_test.go:10)	MOVQ	$1, 16(SP)
0x0040 00064 (goroutine1_test.go:10)	MOVQ	$2, 24(SP)
0x0049 00073 (goroutine1_test.go:10)	MOVQ	$3, 32(SP)
0x0052 00082 (goroutine1_test.go:10)	CALL	runtime.newproc(SB)
```

可以看出调用的是`CALL	runtime.newproc(SB)`
也就是说`go f(args)`相当于`runtime.newproc(size, f, args)`


## 4. goroutine调度
[GMP.md](GMP.md)

## 5. 参考
- [Go语言goroutine调度器概述\(11\) \- 爱写程序的阿波张 \- 博客园](https://www.cnblogs.com/abozhang/p/10802319.html)