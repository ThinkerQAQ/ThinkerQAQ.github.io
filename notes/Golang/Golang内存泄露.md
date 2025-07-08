## 1. 内存泄露
[内存泄露.md](../Virtual_Machine/内存泄露.md)

## 2. Golang内存泄露
### 2.1. root对象引用

```go
var cache = map[interface{}]interface{}{}

func keepalloc() {
  for i := 0; i < 10000; i++ {
    m := make([]byte, 1<<10)
    cache[i] = m
  }
}
```


### 2.2. goroutine 泄漏
[goroutine泄露：原理、场景、检测和防范 \- SegmentFault 思否](https://segmentfault.com/a/1190000019644257)

- 如果你启动了一个 goroutine，但并没有符合预期的退出，那么直到程序结束这个goroutine才会退出。这就是goroutine泄漏
- 当 goroutine 泄露发生时，
    - 该 goroutine 的栈(一般 2k 内存空间起)一直被占用不能释放
    - goroutine 里的函数在堆上申请的空间也不能被 垃圾回收器 回收。
一个程序持续不断地产生新的 goroutine

```go

func keepalloc2() {
  for i := 0; i < 100000; i++ {
    go func() {
      select {}
    }()
  }
}
```
### 2.3. 非runtime管理的内存泄露
比如cgo分配的内存，不属于golang runtime管理
## 3. 如何分析内存泄露
1. top命令查看是否golang程序占用内存高
2. 使用pprof分析
    1. `go tool pprof http://xxx/debug/pprof/heap?debug=1`查看[runtime.MemStat](内存管理.md)。
        - 查看HeapSys+StackSys或者Sys ，如果远远小于Top的RSS，那么说明消耗的内存不是由go runtime管理的，问题可能出在cgo，
            - 对于cgo而言，为了不让goroutine阻塞，cgo都是单独开一个线程进行处理的，这种是runtime不能管理的；可以通过`ps -mp PID`查看线程数，数量很大那么说明就是cgo开辟的线程
            - valgrind或者bcc分析C程序内存泄露[Go程序内存泄露问题快速定位 \- MySpace](https://www.hitzhangjie.pro/blog/2021-04-14-go%E7%A8%8B%E5%BA%8F%E5%86%85%E5%AD%98%E6%B3%84%E9%9C%B2%E9%97%AE%E9%A2%98%E5%BF%AB%E9%80%9F%E5%AE%9A%E4%BD%8D/#%E5%85%B6%E4%BB%96%E6%96%B9%E5%BC%8F)
        - 如果HeapInuse远远小于Top的RSS，那么可能是Go1.12中引进MADV_FREE模式导致的，通过HeapIdle-HeapReleased可以知道没有归还给OS的内存有多少
    2. 查看goroutine数量，分析是否goroutine阻塞造成泄露
        1. `go tool pprof http://xxx/debug/pprof/goroutine?debug=1`查看goroutine数量
        2. `go tool pprof http://xxx/debug/pprof/goroutine?debug=2`查看goroutine详情，是否有锁资源或者chan send阻塞的情况
    3. `go tool pprof http://xxx/debug/pprof/heap`查看堆对象占用情况，找出占用最大的


## 4. 内存泄露实例
### 4.1. Top RSS > Golang heap Size
压测后发现Top的RSS值没有下降，Top查看了下是Golang进程的RSS占用很高，Golang pprof分析了下发现没有占用很高的内存对象，排查发现是Go1.12中引进MADV_FREE模式导致的，即为了提高内存分配效率Golang runtime回收对象后不把内存还给操作系统

### 4.2. 内存掉-1分析
监控发现Golang程序每隔2小时内存掉为-1，以为是panic，查了下panic日志发现没问题，Golang pprof分析了下发现没有占用很高的内存对象，不过有引用cgo库，所以以为是c程序core dump了导致panic没捕获，然后打开core dump开关发现也没有，想来想去怀疑是监控问题，然后在另一个属性监控页面发现内存是正常的，没有掉-1的情况，所以结论就是监控问题

### 4.3. cgo内存泄露
程序定时执行，HTTP取出主播的封面图片，然后调用imagick调整像素，HTTP重新上传
HTTP client只设置了TCP建立连接的超时时间，没有设置HTTP的请求超时
```go
DefaultCli = &http.Client{
		Transport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout:   2 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
	}}
```
channel在make的时候没有设置缓冲值，所以当超时的时候函数返回，此时ch没有消费者了，就一直阻塞了
```go
func RebuildImage() {
	var wg sync.WaitGroup
	wg.Add(3)

	// 耗时1
	go func() {
		// do sth
		defer wg.Done()
	} ()

	// 耗时2
	go func() {
		// do sth
		defer wg.Done()
	} ()

	// 耗时3
	go func() {
		// do sth
		defer wg.Done()
	} ()

	ch := make(chan struct{})

	go func () {
		wg.Wait()
		ch <- struct{}{}
	}()

	// 接收完成或者超时
	select {
	case <- ch:
		return
	case <- time.After(time.Second * 10):
		return
	}
}
```

服务里面有用到cgo的一个库进行图片处理，在处理的时候占用了很大的内存，由于某种原因阻塞或者没有释放线程，导致服务的线程数暴涨，最终导致了golang的内存泄漏
## 5. 参考
- [内存泄漏，8次goroutine泄漏，1次真正内存泄漏 \- rsapaper\_ing \- 博客园](https://www.cnblogs.com/rsapaper/p/15208841.html)
- [performance \- How to analyze golang memory? \- Stack Overflow](https://stackoverflow.com/questions/24863164/how-to-analyze-golang-memory)
- [runtime package \- runtime \- pkg\.go\.dev](https://pkg.go.dev/runtime#MemStats)