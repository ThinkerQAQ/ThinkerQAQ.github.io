## 1. atomic是什么
原子性

- 一个或多个操作要么全部执行，要么全部不执行。
- 最小的不可并行化的操作，就是同一时刻最多只有一个并发体对资源进行操作
- 一般情况下，原子操作都是通过“互斥”访问来保证的，通常由特殊的CPU指令提供保护

## 2. atomic value是什么
atomic包把底层硬件提供的原子操作封装成了go函数，但是只支持几种基本数据类型。
atomic value则可以原子地Store和Load任意类型的值

## 3. 如何使用
```go
var (
	count        = 0
	GlobalConfig atomic.Value
	updateSignal chan int = make(chan int)
)

type config struct {
	Url      string
	Name     string
	Password string
}

func init() {
	GlobalConfig.Store(&config{
		Url:      strconv.Itoa(count),
		Name:     strconv.Itoa(count),
		Password: strconv.Itoa(count),
	})
}

func updateConfig(count int) {
	GlobalConfig.Store(&config{
		Url:      strconv.Itoa(count),
		Name:     strconv.Itoa(count),
		Password: strconv.Itoa(count),
	})
	updateSignal <- 1
}

func loadConfig() *config {
	return GlobalConfig.Load().(*config)
}

func TestAtomic1(t *testing.T) {
	//后台协程更新配置
	go func() {
		for {
			time.Sleep(3 * time.Second)
			count++
			updateConfig(count)
		}
	}()

	//主协程拉取最新配置处理
	for {
		select {
		case <-updateSignal:
			fmt.Println(loadConfig())
			//...
		}
	}

}

```

## 4. 源码分析

### 4.1. 数据结构
```go
type Value struct {
  v interface{}//可以存储任何类型的值
}

//用于将interface{}类型分解，得到其中的两个字段
type ifaceWords struct {
  typ  unsafe.Pointer
  data unsafe.Pointer
}
```

### 4.2. 方法
#### 4.2.1. Store
```go
func (v *Value) Store(x interface{}) {
  if x == nil {
    panic("sync/atomic: store of nil value into Value")
  }
  vp := (*ifaceWords)(unsafe.Pointer(v))  // vp旧的值
  xp := (*ifaceWords)(unsafe.Pointer(&x)) // xp新的值
  //死循环
  for {
    typ := LoadPointer(&vp.typ)//获取旧值得动态类型
    if typ == nil {//动态类型为空，说明第一次初始化

      runtime_procPin()
      //CAS把旧值的动态类型设置为111...111
      if !CompareAndSwapPointer(&vp.typ, nil, unsafe.Pointer(^uintptr(0))) {
        runtime_procUnpin()
        continue//没有设置成功继续for循环
      }
      // 设置动态值和动态类型
      StorePointer(&vp.data, xp.data)
      StorePointer(&vp.typ, xp.typ)
      runtime_procUnpin()
      return//第一次设置成功直接返回
    }
    //如果动态类型为11111...11111，说明有其他协程在进行第一次设置值
    if uintptr(typ) == ^uintptr(0) {
      // 继续for循环至第一次设置成功
      continue
    }
    // 检查旧值的动态类型和新值的动态类型是否一致，不一致panic
    if typ != xp.typ {
      panic("sync/atomic: store of inconsistently typed value into Value")
    }
    //设置动态值
    StorePointer(&vp.data, xp.data)
    return
  }
}

```
`StorePointer、LoadPointer`是原子操作。
这里的关键在于第一次需要**set动态类型**和**set动态值**，这里是两步操作，要保证原子性的话需要加锁。这里是通过CASset动态类型为`unsafe.Pointer(^uintptr(0))`来充当锁
第二次操作只需要set动态值即可，因此不需要再CASset动态类型为`unsafe.Pointer(^uintptr(0))`来充当锁

![](https://raw.githubusercontent.com/TDoct/images/master/1598101016_20200822205631903_6975.png)

#### 4.2.2. Load
```go
func (v *Value) Load() (x interface{}) {
  vp := (*ifaceWords)(unsafe.Pointer(v))
  //获取旧值的动态类型
  typ := LoadPointer(&vp.typ)
  //如果动态类型为空，说明还没进行第一次设置，返回nil
  if typ == nil || uintptr(typ) == ^uintptr(0) {
    return nil
  }
  //获取动态值
  data := LoadPointer(&vp.data)
  //把动态值和动态类型 赋值 到新的变量xp
  xp := (*ifaceWords)(unsafe.Pointer(&x))
  xp.typ = typ
  xp.data = data
  return
}

```
## 5. 参考
- [理解 Go 标准库中的 atomic\.Value 类型 \- 掘金](https://juejin.im/post/6844903929088573454)