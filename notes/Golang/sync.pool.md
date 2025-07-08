## 1. 是什么
保存temp object的pool。
temp表示这个对象可能会被回收，所以这个pool其实就是个cache
## 2. 为什么需要
将暂时不用的对象缓存起来，待下次需要的时候直接使用
这样就不用经过内存分配，减轻GC的压力

## 3. 怎么使用
```go
package main

import (
	"fmt"
	"sync"
)

var pool *sync.Pool

type Person struct {
	Name string
}

func (p *Person)Reset() {
    p.Name = ""
}

//初始化pool。需要设置号New函数
func initPool() {
	pool = &sync.Pool{
		New: func() interface{} {
			fmt.Println("Creating a new Person")
			return new(Person)
		},
	}
}

func main() {
	initPool()
	//第一次调用Get方法，没有存货那么调用New函数创建对象
	p := pool.Get().(*Person)
	fmt.Println("首次从 pool 里获取：", p)
    //初始化
    p.Reset()
	p.Name = "first"
	fmt.Printf("设置 p.Name = %s\n", p.Name)
	//用完了之后放回池子
	pool.Put(p)
	//第二次调用Get方法，有存货直接返回
	fmt.Println("Pool 里已有一个对象：&{first}，调用 Get: ", pool.Get().(*Person))
	//第三次调用Get方法，没有存货那么调用New函数创建对象
	fmt.Println("Pool 没有对象了，调用 Get: ", pool.Get().(*Person))
}

```

### 3.1. fmt
- Printf
```go
func Printf(format string, a ...interface{}) (n int, err error) {
    //输出到os.Stdout--标准输出
	return Fprintf(os.Stdout, format, a...)
}
```

- Fprintf

```go
func Fprintf(w io.Writer, format string, a ...interface{}) (n int, err error) {
	p := newPrinter()//创建pp
	p.doPrintf(format, a)
	n, err = w.Write(p.buf)
	p.free()//将 pp 指针归还到 Pool 中
	return
}

func newPrinter() *pp {
    //其实是从Pool中获取pp
	p := ppFree.Get().(*pp)
	p.panicking = false
	p.erroring = false
	p.wrapErrs = false
	p.fmt.init(&p.buf)
	return p
}

var ppFree = sync.Pool{
	New: func() interface{} { return new(pp) },
}


func (p *pp) free() {
	if cap(p.buf) > 64<<10 {
		return
	}

    //归还到 Pool 前将对象的一些字段清零
	p.buf = p.buf[:0]
	p.arg = nil
	p.value = reflect.Value{}
	p.wrappedErr = nil
	ppFree.Put(p)
}
```

## 4. 源码分析
### 4.1. 数据结构

- Pool

```go
type Pool struct {
	noCopy noCopy

    // 每个 P 的本地队列，实际类型为 [P]poolLocal
	local     unsafe.Pointer // 指向 [P]poolLocal数组
	// [P]poolLocal的大小
	localSize uintptr        // local数组的大小

    //在一轮 GC 到来时，victim 和 victimSize 会分别“接管” local 和 localSize。victim 的机制用于减少 GC 后冷启动导致的性能抖动，让分配对象更平滑
	victim     unsafe.Pointer // local from previous cycle
	victimSize uintptr        // size of victims array

	// 自定义的对象创建回调函数，当 pool 中无可用对象时会调用此函数
	New func() interface{}
}

```

- poolLocal

```go
// Local per-P Pool appendix.
type poolLocalInternal struct {
	private interface{} //  P 的私有缓存区，使用时无需要加锁
	shared  poolChain   // 公共缓存区。本地 P 可以 pushHead/popHead；其他 P 则只能 popTail
}

type poolLocal struct {
	poolLocalInternal

	// 将 poolLocal 补齐至两个缓存行的倍数，防止 false sharing,
	// 每个缓存行具有 64 bytes，目前我们的处理器一般拥有32KB缓存，所以有32 * 1024 / 64 = 512 条缓存行
	// 伪共享，仅占位用，防止在 cache line 上分配多个 poolLocalInternal
	pad [128 - unsafe.Sizeof(poolLocalInternal{})%128]byte
}

```

- poolChain

```go
type poolChain struct {
	// 只有生产者会 push to，不用加锁
	head *poolChainElt

	// 读写需要原子控制。 pop from
	tail *poolChainElt
}

type poolChainElt struct {
	poolDequeue

	// next 被 producer 写，consumer 读。所以只会从 nil 变成 non-nil
	// prev 被 consumer 写，producer 读。所以只会从 non-nil 变成 nil
	next, prev *poolChainElt
}


//poolDequeue 被实现为单生产者、多消费者的固定大小的无锁（atomic 实现） Ring 式队列（底层存储使用数组，使用两个指针标记 head、tail）。生产者可以从 head 插入、head 删除，而消费者仅可从 tail 删除。
type poolDequeue struct {

    //headTail 指向队列的头和尾，通过位运算将 head 和 tail 存入 headTail 变量中。
	// headTail 包含一个 32 位的 head 和一个 32 位的 tail 指针。这两个值都和 len(vals)-1 取模过。
	// tail 是队列中最老的数据，head 指向下一个将要填充的 slot
    // slots 的有效范围是 [tail, head)，由 consumers 持有。
	headTail uint64

	// vals 是一个存储 interface{} 的环形队列，它的 size 必须是 2 的幂
	// 如果 slot 为空，则 vals[i].typ 为空；否则，非空。
	// 一个 slot 在这时宣告无效：tail 不指向它了，vals[i].typ 为 nil
	// 由 consumer 设置成 nil，由 producer 读
	vals []eface
}
```



![](https://raw.githubusercontent.com/TDoct/images/master/1598454286_20200826151512351_24414.png)
### 4.2. 方法
#### 4.2.1. Get
```go
func (p *Pool) Get() interface{} {
    // ......
    //调用 p.pin() 函数将当前的 goroutine 和 P 绑定，禁止被抢占，返回当前 P 对应的 poolLocal，以及 pid
	l, pid := p.pin()
	//然后直接取 l.private，赋值给 x，并置 l.private 为 nil
	x := l.private
	l.private = nil
	if x == nil {
	    //判断 x 是否为空，若为空，则尝试从 l.shared 的头部 pop 一个对象出来，同时赋值给 x
		x, _ = l.shared.popHead()
		if x == nil {
		    //如果 x 仍然为空，则调用 getSlow 尝试从其他 P 的 shared 双端队列尾部“偷”一个对象出来
			x = p.getSlow(pid)
		}
	}
	//Pool 的相关操作做完了，调用 runtime_procUnpin() 解除非抢占
	runtime_procUnpin()
    // ......
    //最后如果还是没有取到缓存的对象，那就直接调用预先设置好的 New 函数，创建一个出来
	if x == nil && p.New != nil {
		x = p.New()
	}
	return x
}
```
![](https://raw.githubusercontent.com/TDoct/images/master/1598454289_20200826152011894_32182.png)

#### 4.2.2. Put
```go
// src/sync/pool.go

// Put 将对象添加到 Pool 
func (p *Pool) Put(x interface{}) {
	if x == nil {
		return
	}
	// ……
	//先绑定 g 和 P，然后尝试将 x 赋值给 private 字段。
	l, _ := p.pin()
	if l.private == nil {
		l.private = x
		x = nil
	}
	//如果失败，就调用 pushHead 方法尝试将其放入 shared 字段所维护的双端队列中。
	if x != nil {
		l.shared.pushHead(x)
	}
	runtime_procUnpin()
    //…… 
}
```
![](https://raw.githubusercontent.com/TDoct/images/master/1598454292_20200826153214882_24667.png)

### 4.3. GC
所有的池技术中，都会在某个时刻清除缓存对象。

pool.go的init函数
```go
func init() {
    //注册了GC发生的时候如何清理Pool的函数
	runtime_registerPoolCleanup(poolCleanup)
}
```

- poolCleanup

```go
func poolCleanup() {
    //清空old pools
	for _, p := range oldPools {
		p.victim = nil
		p.victimSize = 0
	}

	// Move primary cache to victim cache.
	//把所有的pool丢到victim中
	for _, p := range allPools {
		p.victim = p.local
		p.victimSize = p.localSize
		p.local = nil
		p.localSize = 0
	}

	oldPools, allPools = allPools, nil
}
```

## 5. 总结
- sync.Pool 是协程安全的，使用起来非常方便。设置好 New 函数后，调用 Get 获取，调用 Put 归还对象
- 不要对 Get 得到的对象有任何假设，更好的做法是归还对象时，将对象“清空”
- Pool 里对象的生命周期受 GC 影响，不适合于做连接池，因为连接池需要自己管理对象的生命周期
## 6. 参考
- [深度解密Go语言之sync\.pool \| qcrao](https://qcrao.com/2020/04/20/dive-into-go-sync-pool/)