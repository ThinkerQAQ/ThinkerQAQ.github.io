## 1. context
goroutine的上下文，在 goroutine 之间传递上下文信息，包括：取消信号、超时时间、截止时间、k-v 等。
控制并发的其中一种方式，另外一种是[sync.WaitGroup.md](sync.WaitGroup.md)


## 2. 使用
### 2.1. deadlines：超时取消

```go
func TestContext1(t *testing.T) {
	//设置一秒后超时的context
	d := time.Now().Add(1 * time.Second)
	ctx, cancel := context.WithDeadline(context.Background(), d)

	// Even though ctx will be expired, it is good practice to call its
	// cancelation function in any case. Failure to do so may keep the
	// context and its parent alive longer than necessary.
	defer cancel()

	select {
	case <-time.After(2 * time.Second):
		fmt.Println("2s后超时")
	case <-ctx.Done():
		//1s后超时
		fmt.Println(ctx.Err())
	}
}

//输出
context deadline exceeded
```

### 2.2. cancellation signals：控制多个goroutine的终止

- channel只能控制一个goroutine

```go
func TestChannel1(t *testing.T) {
	stop := make(chan bool)

	go func() {
		for {
			select {
			case <-stop:
				fmt.Println("监控退出，停止了...")
				return
			default:
				fmt.Println("goroutine持续监控中...")
				time.Sleep(2 * time.Second)
			}
		}
	}()

	//10s后通知goroutine关闭
	time.Sleep(10 * time.Second)
	fmt.Println("通知goroutine监控停止")
	stop<- true
	time.Sleep(5 * time.Second)
}

//输出
goroutine持续监控中...
goroutine持续监控中...
goroutine持续监控中...
goroutine持续监控中...
goroutine持续监控中...
通知goroutine监控停止
监控退出，停止了...
```

- context可以控制多个goroutine


```go
func TestContext2(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	go watch(ctx, "【监控1】")
	go watch(ctx, "【监控2】")
	go watch(ctx, "【监控3】")

	//10s后调用cancel通知所有goroutine取消
	time.Sleep(10 * time.Second)
	fmt.Println("通知goroutine监控停止")
	cancel()
	//为了检测监控过是否停止，如果没有监控输出，就表示停止了
	time.Sleep(5 * time.Second)
}

func watch(ctx context.Context, name string) {
	for {
		select {
		case <-ctx.Done():
			fmt.Println(name, "监控退出，停止了...", ctx.Err())
			return
		default:
			fmt.Println(name, "goroutine持续监控中...")
			time.Sleep(2 * time.Second)
		}
	}
}

//输出
【监控3】 goroutine持续监控中...
【监控1】 goroutine持续监控中...
【监控2】 goroutine持续监控中...
【监控2】 goroutine持续监控中...
【监控1】 goroutine持续监控中...
【监控3】 goroutine持续监控中...
【监控3】 goroutine持续监控中...
【监控1】 goroutine持续监控中...
【监控2】 goroutine持续监控中...
【监控3】 goroutine持续监控中...
【监控1】 goroutine持续监控中...
【监控2】 goroutine持续监控中...
【监控2】 goroutine持续监控中...
【监控1】 goroutine持续监控中...
【监控3】 goroutine持续监控中...
通知goroutine监控停止
【监控2】 监控退出，停止了... context canceled
【监控3】 监控退出，停止了... context canceled
【监控1】 监控退出，停止了... context canceled
```

### 2.3. request-scoped data：类似于ThreadLocal

```go
func TestContext3(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	//附加值
	valueCtx := context.WithValue(ctx, key, "【监控1】")
	go watch2(valueCtx)
	//10s后调用cancel通知所有goroutine取消
	time.Sleep(10 * time.Second)
	fmt.Println("通知goroutine监控停止")
	cancel()
	//为了检测监控过是否停止，如果没有监控输出，就表示停止了
	time.Sleep(5 * time.Second)
}

func watch2(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			//取出值
			fmt.Println(ctx.Value(key), "监控退出，停止了...")
			return
		default:
			//取出值
			fmt.Println(ctx.Value(key), "goroutine监控中...")
			time.Sleep(2 * time.Second)
		}
	}
}
//输出
【监控1】 goroutine监控中...
【监控1】 goroutine监控中...
【监控1】 goroutine监控中...
【监控1】 goroutine监控中...
【监控1】 goroutine监控中...
通知goroutine监控停止
【监控1】 监控退出，停止了...
```


## 3. 原理
### 3.1. 类图
![](https://raw.githubusercontent.com/TDoct/images/master/1597554973_20200816115451743_31113.png)

### 3.2. 数据结构
#### 3.2.1. Context接口
所有的Context都会实现这个接口
```go
type Context interface {
	// 当 context 被取消或者到了 deadline，返回一个被关闭的 channel
	// receive-only 的 channel。因此在子协程里读这个 channel，除非被关闭，否则读不出来任何东西。也正是利用了这一点，子协程从 channel 里读出了值（零值）后，就可以做一些收尾工作，尽快退出。
	Done() <-chan struct{}

	// 在 channel Done 关闭后，返回 context 取消原因，例如是被取消，还是超时。
	Err() error

	// 返回 context 是否会被取消以及自动取消时间（即 deadline）
	Deadline() (deadline time.Time, ok bool)

	// 获取 key 对应的 value
	Value(key interface{}) interface{}
}
```

##### 3.2.1.1. emptyCtx
是Context接口的默认实现。

```go
type emptyCtx int

func (*emptyCtx) Deadline() (deadline time.Time, ok bool) {
	return
}

func (*emptyCtx) Done() <-chan struct{} {
	return nil
}

func (*emptyCtx) Err() error {
	return nil
}

func (*emptyCtx) Value(key interface{}) interface{} {
	return nil
}
```
这个emptyCtx用于定义`background`和`todo`。background一般用于main函数，todo一般用于占位符。
```go
var (
	background = new(emptyCtx)
	todo       = new(emptyCtx)
)

func Background() Context {
	return background
}

func TODO() Context {
	return todo
}

```


##### 3.2.1.2. valueCtx

```go
type valueCtx struct {
	Context
	key, val interface{}
}

func (c *valueCtx) String() string {
	return fmt.Sprintf("%v.WithValue(%#v, %#v)", c.Context, c.key, c.val)
}

func (c *valueCtx) Value(key interface{}) interface{} {
	if c.key == key {
		return c.val
	}
	return c.Context.Value(key)
}
    
```
#### 3.2.2. canceler接口
```go
type canceler interface {
	cancel(removeFromParent bool, err error)
	Done() <-chan struct{}
}
```
如果一个Context实现了canceler接口，那么就是可取消的。比如上图的`*cancelCtx `和 `*timerCtx`


##### 3.2.2.1. cancelCtx 
实现了Context和canceler接口

```go
type cancelCtx struct {
    //实现了Context
	Context

	// 保护之后的字段
	mu       sync.Mutex
	done     chan struct{}
	children map[canceler]struct{}
	err      error
}

func (c *cancelCtx) Done() <-chan struct{} {
	c.mu.Lock()
	//懒汉式创建，第一次调用Done（）时才创建
	if c.done == nil {
		c.done = make(chan struct{})
	}
	d := c.done
	c.mu.Unlock()
	//直接返回channel。调用者一般配置select使用。一旦关闭就会读出零值
	return d
}

//第一个参数取消的时候，需要将自己从父节点里删除。第二个参数则是一个固定的取消错误类型
func (c *cancelCtx) cancel(removeFromParent bool, err error) {
    // 必须要传 err
	if err == nil {
		panic("context: internal error: missing cancel error")
	}
	c.mu.Lock()
	// 已经被其他协程取消
	if c.err != nil {
		c.mu.Unlock()
		return 
	}
	// 给 err 字段赋值
	c.err = err
	// 关闭 channel，通知其他协程
	if c.done == nil {
		c.done = closedchan
	} else {
		close(c.done)
	}
	
	// 遍历它的所有子节点
	for child := range c.children {
	    // 递归地取消所有子节点
		child.cancel(false, err)
	}
	// 将子节点置空
	c.children = nil
	c.mu.Unlock()

	if removeFromParent {
	    // 从父节点中移除自己 
		removeChild(c.Context, c)
	}
}


func removeChild(parent Context, child canceler) {
	p, ok := parentCancelCtx(parent)
	if !ok {
		return
	}
	p.mu.Lock()
	if p.children != nil {
	    //从父节点中所有子节点中删除该节点
		delete(p.children, child)
	}
	p.mu.Unlock()
}


func parentCancelCtx(parent Context) (*cancelCtx, bool) {
	for {
	//这里只会识别三种 Context 类型：*cancelCtx，*timerCtx，*valueCtx。若是把 Context 内嵌到一个类型里，就识别不出来了
		switch c := parent.(type) {
		case *cancelCtx:
			return c, true
		case *timerCtx:
			return &c.cancelCtx, true
		case *valueCtx:
			parent = c.Context
		default:
			return nil, false
		}
	}
}

```

![](https://raw.githubusercontent.com/TDoct/images/master/1597554976_20200816131537077_23346.png)


##### 3.2.2.2. timerCtx
```go
type timerCtx struct {
	cancelCtx
	//基于 cancelCtx，只是多了一个 time.Timer 和一个 deadline
	timer *time.Timer
	deadline time.Time
}


func (c *timerCtx) cancel(removeFromParent bool, err error) {
	// 直接调用 cancelCtx 的取消方法
	c.cancelCtx.cancel(false, err)
	if removeFromParent {
		// 从父节点中删除子节点
		removeChild(c.cancelCtx.Context, c)
	}
	c.mu.Lock()
	if c.timer != nil {
		// 关掉定时器，这样，在deadline 到来时，不会再次取消
		c.timer.Stop()
		c.timer = nil
	}
	c.mu.Unlock()
}

```
### 3.3. 方法
#### 3.3.1. WithCancel
创建一个cancelCtx
```go
var Canceled = errors.New("context canceled")

//传入一个父 Context（这通常是一个 background，作为根节点）
//返回新的context和cancelFunc，当cancelFunc被调用者是父节点的CancelFunc 被调用，此context就会被取消
func WithCancel(parent Context) (ctx Context, cancel CancelFunc) {
	c := newCancelCtx(parent)
	//该节点挂靠到父节点中
	propagateCancel(parent, &c)
	//最终会调用cancel方法
	return &c, func() { c.cancel(true, Canceled) }
}

func newCancelCtx(parent Context) cancelCtx {
	return cancelCtx{Context: parent}
}


func propagateCancel(parent Context, child canceler) {
	// 父节点是个空节点
	if parent.Done() == nil {
		return // parent is never canceled
	}
	// 找到可以取消的父 context
	if p, ok := parentCancelCtx(parent); ok {
		p.mu.Lock()
		if p.err != nil {
			// 父节点已经被取消了，本节点（子节点）也要取消
			child.cancel(false, p.err)
		} else {
			// 父节点未取消
			if p.children == nil {
				p.children = make(map[canceler]struct{})
			}
			// "挂到"父节点上
			p.children[child] = struct{}{}
		}
		p.mu.Unlock()
	} else {
		// 如果没有找到可取消的父 context。新启动一个协程监控父节点或子节点取消信号
		go func() {
			select {
			case <-parent.Done():
				child.cancel(false, parent.Err())
			case <-child.Done():
			}
		}()
	}
}


```


#### 3.3.2. WithTimeout
创建一个timerCtx
```go
func WithTimeout(parent Context, timeout time.Duration) (Context, CancelFunc) {
	return WithDeadline(parent, time.Now().Add(timeout))
}

func WithDeadline(parent Context, deadline time.Time) (Context, CancelFunc) {
    //如果父节点 context 的 deadline 早于指定时间。直接构建一个可取消的 context。
	if cur, ok := parent.Deadline(); ok && cur.Before(deadline) {
		// 原因是一旦父节点超时，自动调用 cancel 函数，子节点也会随之取消。
		// 所以不用单独处理子节点的计时器时间到了之后，自动调用 cancel 函数
		return WithCancel(parent)
	}
	
	// 构建 timerCtx
	c := &timerCtx{
		cancelCtx: newCancelCtx(parent),
		deadline:  deadline,
	}
	// 挂靠到父节点上
	propagateCancel(parent, c)
	
	// 计算当前距离 deadline 的时间
	d := time.Until(deadline)
	if d <= 0 {
		// 直接取消
		c.cancel(true, DeadlineExceeded) // deadline has already passed
		return c, func() { c.cancel(true, Canceled) }
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.err == nil {
		// d 时间后，timer 会自动调用 cancel 函数。自动取消
		c.timer = time.AfterFunc(d, func() {
			c.cancel(true, DeadlineExceeded)
		})
	}
	return c, func() { c.cancel(true, Canceled) }
}

var DeadlineExceeded error = deadlineExceededError{}

type deadlineExceededError struct{}

func (deadlineExceededError) Error() string   { return "context deadline exceeded" }

```

#### 3.3.3. WithValue
创建一个valueCtx
```go

func WithValue(parent Context, key, val interface{}) Context {
	if key == nil {
		panic("nil key")
	}
	if !reflect.TypeOf(key).Comparable() {
		panic("key is not comparable")
	}
	return &valueCtx{parent, key, val}
}

```
多次调用会构造一棵树
![](https://raw.githubusercontent.com/TDoct/images/master/1598181405_20200816133210223_32609.png)

取出值得过程是先从本节点找，不行从父节点找
```go
func (c *valueCtx) Value(key interface{}) interface{} {
	if c.key == key {
		return c.val
	}
	return c.Context.Value(key)
}

```
## 4. context cancel vs context deadline exceed
假设有一个context，设置了1s超时，然后context.Cancel()会触发`context cancel`错误（主动）
如果时间超过了1s，那么会触发`context deadline exceed`错误（被动）
## 5. 总结
- 线程安全
- Context可以用于deadlines、cancellation signals和其他request scope中传递数据
- `WithCancel, WithDeadline, WithTimeout`接受一个parent context作为参数，返回一个child context和CancelFunc，调用CancelFunc会取消这个child以及他的children，并且删除从parent指向这个child的引用，如果不调用的话那么等到parent cancel他才被取消
- `Context`不要用在struct中，而是通过函数第一个参数的方式进行共享，同时不确定的时候传参不要传递nil而是用`context.TODO`
- 主要有三个方法
    - `func WithCancel(parent Context) (ctx Context, cancel CancelFunc)`，调用CancelFunc可以释放context上持有的资源，否则等到parent来cancel
    - `func WithDeadline(parent Context, d time.Time) (Context, CancelFunc)`比上面的多了一个超时，到达d时刻会自动释放资源
    - `func WithTimeout(parent Context, timeout time.Duration) (Context, CancelFunc)`就是`WithDeadline(parent, time.Now().Add(timeout)).`

- `func WithValue(parent Context, key, val interface{}) Context`。key必须camparable并且不能是built-in type

- 说白了ctx就是个链表，效率为O（N）

## 6. 参考
- [context \- The Go Programming Language](https://golang.org/pkg/context/)
- [Go语言实战笔记（二十）\| Go Context \| 飞雪无情的博客](https://www.flysnow.org/2017/05/12/go-in-action-go-context.html)
- [Golang Context深入理解 \- 掘金](https://juejin.im/post/5a6873fef265da3e317e55b6)