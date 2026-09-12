---
title: "2.11 atomic"
description: "1. atomic是什么 原子性 - 一个或多个操作要么全部执行，要么全部不执行。 - 最小的不可并行化的操作，就是同一时刻最多只有一个并发体对资源进行操作 - 一般情况下，原子操作都是通过“互斥”访问来保证的，通常由特殊的CPU指令提供保护 2. atomic value是什么 atomic包把底"
sourcePath: "Golang/atomic.md"
category: "go"
categoryLabel: "Go"
topic: "concurrency"
topicLabel: "2.Concurrency"
order: 24
tags: ["Golang"]
createdAt: "2020-08-22T09:49:43Z"
updatedAt: "2020-09-08T14:57:16Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 0. 版本说明（2026）

这是一篇 2020 年的历史学习笔记。`atomic.Value` 的核心思路仍然成立，但标准库接口和实现已经继续演进：

- `sync/atomic`现在除了传统函数式API，还提供`Bool`、`Int32`、`Int64`、`Uint32`、`Uint64`、`Uintptr`、`Pointer[T]`等类型化原子类型。
- `atomic.Value`要求所有Store保持一致的具体类型，第一次Store之后不能复制这个Value。
- 当前Go内存模型中，如果原子操作A的效果被原子操作B观察到，则A synchronizes before B；Go的原子操作表现为一个顺序一致（sequentially consistent）的总顺序。
- 下面“源码分析”保留的是2020年前后的旧版实现。当前源码仍然使用接口的type/data两个word完成`Value`的原子发布，但“第一次Store”的哨兵写法等细节已经变化，不能把旧代码逐行当成当前实现。

## 1. atomic是什么

原子操作的核心是：对其他并发执行者来说，一个操作不会暴露“执行到一半”的中间状态。

- 常见CPU提供CAS、原子读写、原子加减等指令，Go runtime/标准库再把它们封装成跨平台API。
- atomic并不等价于“任何一组操作自动变成事务”；多个独立atomic操作组合起来，仍然需要自己证明并发语义正确。
- `sync/atomic`属于低层同步原语。业务代码通常优先考虑`sync.Mutex`、channel等更容易验证正确性的方式。

## 2. atomic.Value是什么

`atomic.Value`可以原子地发布和读取一个**类型保持一致**的值，常见场景是“读多写少”的配置快照：写方构造完整的新对象，然后一次Store；读方每次Load得到一个完整快照。

注意：

- 第一次Store之前，Load返回nil；
- Store不能写入nil；
- 第一次Store确定具体类型后，后续Store必须保持相同具体类型；
- Value第一次使用后不能再被复制。

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

这里真正重要的模式不是示例中的通知channel，而是：**不要原地修改正在被读方共享的config；构造一个新的不可变快照，再用`atomic.Value.Store`一次性发布。**

## 4. 源码分析（历史实现）

下面代码对应这篇笔记写作时期的旧版Go源码，用于理解`atomic.Value`为什么需要特殊处理第一次Store。

### 4.1. 数据结构
```go
type Value struct {
  v interface{}
}

// 用于拆解空接口的type/data两个word。
type ifaceWords struct {
  typ  unsafe.Pointer
  data unsafe.Pointer
}
```

### 4.2. Store
```go
func (v *Value) Store(x interface{}) {
  if x == nil {
    panic("sync/atomic: store of nil value into Value")
  }
  vp := (*ifaceWords)(unsafe.Pointer(v))
  xp := (*ifaceWords)(unsafe.Pointer(&x))
  for {
    typ := LoadPointer(&vp.typ)
    if typ == nil {
      runtime_procPin()
      if !CompareAndSwapPointer(&vp.typ, nil, unsafe.Pointer(^uintptr(0))) {
        runtime_procUnpin()
        continue
      }
      StorePointer(&vp.data, xp.data)
      StorePointer(&vp.typ, xp.typ)
      runtime_procUnpin()
      return
    }
    if uintptr(typ) == ^uintptr(0) {
      continue
    }
    if typ != xp.typ {
      panic("sync/atomic: store of inconsistently typed value into Value")
    }
    StorePointer(&vp.data, xp.data)
    return
  }
}
```

这段旧实现的关键是：空接口由type和data两个word组成，第一次Store必须避免其他goroutine观察到“type已经发布但data还没发布”的半初始化状态，所以使用一个特殊哨兵把第一次发布串行化。

当前实现仍保留这个总体思路，但哨兵已经改为`firstStoreInProgress`等当前源码细节；学习时应该抓住“**第一次发布需要保证type和data形成一致快照**”，而不是记住某个具体哨兵值。

### 4.3. Load
```go
func (v *Value) Load() (x interface{}) {
  vp := (*ifaceWords)(unsafe.Pointer(v))
  typ := LoadPointer(&vp.typ)
  if typ == nil || uintptr(typ) == ^uintptr(0) {
    return nil
  }
  data := LoadPointer(&vp.data)
  xp := (*ifaceWords)(unsafe.Pointer(&x))
  xp.typ = typ
  xp.data = data
  return
}
```

Load先读取type。若Value尚未初始化，或第一次Store仍在进行，则不能把一个不完整的interface暴露给读方；初始化完成后，再读取data并组装结果。

## 5. 参考
- [sync/atomic package](https://pkg.go.dev/sync/atomic)
- [sync/atomic/value.go](https://go.dev/src/sync/atomic/value.go)
- [The Go Memory Model](https://go.dev/ref/mem)
- [理解 Go 标准库中的 atomic.Value 类型 \- 掘金](https://juejin.im/post/6844903929088573454)