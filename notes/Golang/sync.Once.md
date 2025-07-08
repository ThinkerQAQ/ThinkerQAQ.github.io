## 1. 是什么
Once 是一个对象,它提供了保证某个动作只被执行一次功能
说白了就是使方法只执行一次

## 2. 使用
### 2.1. 单例模式
[单例模式.md](../Design_Pattern/创建型模式/单例模式.md)
```go
type singleton struct {
}

//private
var instance *singleton
var once sync.Once

func TestSync1(t *testing.T) {
	instance1 := GetInstance()
	instance2 := GetInstance()
	fmt.Println(instance1 == instance2)

}
func GetInstance() *singleton {
	once.Do(func() {
		instance = &singleton{}
	})
	return instance
}

```

## 3. 原理

通过sync.atomic+sync.Mutex实现

```go
type Once struct {
	done uint32
	m    Mutex
}

func (o *Once) Do(f func()) {
	if atomic.LoadUint32(&o.done) == 0 {
		o.doSlow(f)
	}
}

func (o *Once) doSlow(f func()) {
	o.m.Lock()
	defer o.m.Unlock()
	if o.done == 0 {
		defer atomic.StoreUint32(&o.done, 1)
		f()
	}
}

```

- Do 方法为什么不直接 o.done == 0 而要使用 atomic.LoadUint32(&o.done) == 0
如果直接 o.done == 0，会导致无法及时观察 doSlow 对 o.done 的值设置

- 为什么 doSlow 方法中直接使用 o.done == 0
已经加锁了，处于临界区

- 既然已经使用的Lock, 为什么不直接 o.done = 1， 还需要 atomic.StoreUint32(&o.done, 1)

## 4. 改造：返回error

```go

// copy from sync.Once, add return error
type Once struct {
	done uint32
	m    sync.Mutex
}

func (o *Once) Do(f func() error) error {
	if atomic.LoadUint32(&o.done) == 0 {
		return o.doSlow(f)
	}
	return nil
}

func (o *Once) doSlow(f func() error) error {
	o.m.Lock()
	defer o.m.Unlock()
	var err error
	if o.done == 0 {
		err = f()
		if err == nil {
			defer atomic.StoreUint32(&o.done, 1)
		}
	}

	return err
}
```
## 5. 参考
- [\[Golang\] 初探之 sync\.Once \- 知乎](https://zhuanlan.zhihu.com/p/44360489)
- [通过 sync\.Once 学习到 Go 的内存模型 \- 掘金](https://juejin.im/post/6844904018490163213)