## 1. 什么是GC
[GC.md](../Virtual_Machine/GC.md)

## 2. 为什么需要GC
[GC.md](../Virtual_Machine/GC.md)


### 2.1. GC的问题
#### 2.1.1. 内存泄露
[Golang内存泄露.md](Golang内存泄露.md)
#### 2.1.2. STW
通过三色标记法减少GC STW的时间
## 3. 如何进行垃圾回收
### 3.1. GC触发
- 主动触发
    - 通过调用 runtime.GC 来触发 GC，此调用阻塞式地等待当前 GC 运行完毕。
- 被动触发，分为两种方式：
    1. 定时。系统监控超过两分钟（`runtime.forcegcperiod`）没有产生任何 GC 时，强制触发 GC。
    2. 步调（Pacing）算法。当一定时间内内存增长比例超过一定值时触发GC

### 3.2. GC过程
1. 标记准备(Mark Setup，需 STW)，打开写屏障(Write Barrier)
2. 使用三色标记法标记（Marking, 并发）
3. 标记结束(Mark Termination，需 STW)，关闭写屏障。
4. 清理(Sweeping, 并发)
### 3.3. Golang GC演进
#### 3.3.1. 传统的标记清除算法
- 分两个阶段：
    - 标记：从根对象出发，DFS遍历可达的对象并标记
    - 清除：没被标记的是垃圾，回收之
- 有几个缺点：
    - STW：标记之前需要STW，直到标记结束
    - 内存碎片
#### 3.3.2. 三色标记清除算法
- 三色标记针对传统的标记清除的STW进行改进
- 一样分两个阶段：
    - 标记：从根对象出发，BFS遍历所有对象，遍历完成的标记为黑，遍历中的标记为灰，不可达的标记为白色
        - 白色对象（可能死亡）：未被回收器访问到的对象。在回收开始阶段，所有对象均为白色，当回收结束后，白色对象均不可达。
        - 灰色对象（波面）：已被回收器访问到的对象，但回收器需要对其中的一个或多个指针进行扫描，因为他们可能还指向白色对象。
        - 黑色对象（确定存活）：已被回收器访问到的对象，其中所有字段都已被扫描，黑色对象中任何一个指针都不可能直接指向白色对象。
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1598282292_20200820160540373_21178.png)
    - 清除：没被标记（白色）是垃圾，回收之
- 如果没有STW，GC和用户线程执行有一个问题，可能把不是垃圾的对象给回收掉。如下：
    1. 灰色对象A引用了白色对象B
    2. 黑色对象C引用了白色对象B
    3. 灰色对象A断开引用白色对象B
    4. 由于黑色对象C已经被标记为黑色不可能在被扫描，此时白色对象B明明被引用了但是却被回收了
- 分析上述情况，可以看出有两个条件会造成这种错误
    - 条件1：白色被挂在黑色下
    - 条件2：灰色同时丢了该白色
- 只要干掉其中之一就能解决这个问题，因此引入了两种方式
    - 强三色不变式（针对条件1）：不存在黑色对象引用到白色对象的指针。即如果白色被挂在黑色下，那么把白色改成灰色
    - 弱三色不变式（针对条件2）：所有被黑色对象引用的白色对象都处于灰色保护状态。即白色被挂在黑色下，那么白色必须同时被其他链路上的灰色引用
#### 3.3.3. 写屏障
##### 3.3.3.1. 插入屏障
为了实现强三色不变式，引入了插入屏障：在A对象引用B对象的时候，B对象被标记为灰色
也引入新的问题：需要re-scan栈上的根对象
##### 3.3.3.2. 删除屏障
为了实现弱三色不变式，引入了删除屏障：被删除的对象，如果自身为灰色或者白色，那么被标记为灰色。
也引入新的问题：明明是垃圾，却要第二次GC才能回收
##### 3.3.3.3. 混合写屏障
混合写屏障则是结合了插入和删除
1. GC开始将栈上的对象DFS全部扫描并标记为黑色(之后不再进行第二次重复扫描，无需STW)，
2. GC期间，任何在栈上创建的新对象，均为黑色。
3. 被删除的对象标记为灰色。
4. 被添加的对象标记为灰色。



## 4. Golang内存泄漏
[Golang内存泄露.md](Golang内存泄露.md)





## 5. GC调优
[GC调优.md](../Virtual_Machine/GC调优.md)

### 5.1. 如何观察GC

1. GODEBUG=gctrace=1

```go

package main

func allocate() {
	_ = make([]byte, 1<<20)
}

func main() {
	for n := 1; n < 100000; n++ {
		allocate()
	}
}
```

- 观察GC
```go
go build -o main
GODEBUG=gctrace=1 ./main
```

- 日志
```log
gc 2 @0.001s 2%: 0.018+1.1+0.029 ms clock, 0.22+0.047/0.074/0.048+0.34 ms cpu, 4->7->3 MB, 5 MB goal, 12 P
```


- 解析
```go
gc 2	第二个 GC 周期
0.001	程序开始后的 0.001 秒
2%	该 GC 周期中 CPU 的使用率
0.018	标记开始时， STW 所花费的时间（wall clock）
1.1	标记过程中，并发标记所花费的时间（wall clock）
0.029	标记终止时， STW 所花费的时间（wall clock）
0.22	标记开始时， STW 所花费的时间（cpu time）
0.047	标记过程中，标记辅助所花费的时间（cpu time）
0.074	标记过程中，并发标记所花费的时间（cpu time）
0.048	标记过程中，GC 空闲的时间（cpu time）
0.34	标记终止时， STW 所花费的时间（cpu time）
4	标记开始时，堆的大小的实际值
7	标记结束时，堆的大小的实际值
3	标记结束时，标记为存活的对象大小
5	标记结束时，堆的大小的预测值
12	P 的数量
```


2. go tool trace

```go

package main

func main() {
  f, _ := os.Create("trace.out")
  defer f.Close()
  trace.Start(f)
  defer trace.Stop()
}
```

- 运行`go tool trace trace.out`
![](https://raw.githubusercontent.com/TDoct/images/master/1598282297_20200820193444765_18405.png)

3. `debug.ReadGCStats`
4. `runtime.ReadMemStats`
### 5.2. 如何调优
#### 5.2.1. 调整的参数只有 GOGC 环境变量
#### 5.2.2. 提高触发GC的阈值
##### 5.2.2.1. memory ballast
指定GC运行的最小heapSize, 低于该值不进行GC
##### 5.2.2.2. 自动调整GCPercent
标准库runtime包提供了`debug.SetGCPercent(int)`调整GC的目标百分比, 默认是100, 即堆内存占用达到上次GC后的一倍后, 触发GC，可以把他调大即可降低GC频率
#### 5.2.3. 减少用户代码分配内存的数量
##### 5.2.3.1. 优化内存的申请速度

```go
package main

import (
  "fmt"
  "os"
  "runtime"
  "runtime/trace"
  "sync/atomic"
  "time"
)

var (
  stop  int32
  count int64
  sum   time.Duration
)

func concat() {
  for n := 0; n < 100; n++ {
    for i := 0; i < 8; i++ {
      go func() {
        s := "Go GC"
        s += " " + "Hello"
        s += " " + "World"
        _ = s
      }()
    }
  }
}

func main() {
  f, _ := os.Create("trace.out")
  defer f.Close()
  trace.Start(f)
  defer trace.Stop()

  go func() {
    var t time.Time
    for atomic.LoadInt32(&stop) == 0 {
      t = time.Now()
      runtime.GC()
      sum += time.Since(t)
      count++
    }
    fmt.Printf("GC spend avg: %v\n", time.Duration(int64(sum)/count))
  }()

  concat()
  atomic.StoreInt32(&stop, 1)
}
```

- 输出
```go
$ go build -o main
$ ./main
GC spend avg: 2.583421ms
```


大部分时间都耗在调度器的等待而不是goroutine的执行，改成一批批地创建goroutine

```go

func concat() {
  wg := sync.WaitGroup{}
  for n := 0; n < 100; n++ {
    wg.Add(8)
    for i := 0; i < 8; i++ {
      go func() {
        s := "Go GC"
        s += " " + "Hello"
        s += " " + "World"
        _ = s
        wg.Done()
      }()
    }
    wg.Wait()
  }
}
```
- 输出
```go
$ go build -o main
$ ./main
GC spend avg: 328.54µs
```

##### 5.2.3.2. 尽可能的少申请内存
##### 5.2.3.3. 复用已申请的内存
```go
package main

import (
  "fmt"
  "net/http"
  _ "net/http/pprof"
)

func newBuf() []byte {
  return make([]byte, 10<<20)
}

func main() {
  go func() {
    http.ListenAndServe("localhost:6060", nil)
  }()
  
  http.HandleFunc("/example2", func(w http.ResponseWriter, r *http.Request) {
    b := newBuf()

    // 模拟执行一些工作
    for idx := range b {
      b[idx] = 1
    }

    fmt.Fprintf(w, "done, %v", r.URL.Path[1:])
  })
  http.ListenAndServe(":8080", nil)
}
```

- 使用sync.Pool复用内存

```go

package main

import (
  "fmt"
  "net/http"
  _ "net/http/pprof"
  "sync"
)

// 使用 sync.Pool 复用需要的 buf
var bufPool = sync.Pool{
  New: func() interface{} {
    return make([]byte, 10<<20)
  },
}

func main() {
  go func() {
    http.ListenAndServe("localhost:6060", nil)
  }()
  http.HandleFunc("/example2", func(w http.ResponseWriter, r *http.Request) {
    b := bufPool.Get().([]byte)
    for idx := range b {
      b[idx] = 0
    }
    fmt.Fprintf(w, "done, %v", r.URL.Path[1:])
    bufPool.Put(b)
  })
  http.ListenAndServe(":8080", nil)
}
```



## 6. 参考
- [Golang中GC回收机制三色标记与混合写屏障\_哔哩哔哩 \(゜\-゜\)つロ 干杯~\-bilibili](https://www.bilibili.com/video/BV1wz4y1y7Kd)
- [5、Golang三色标记\+混合写屏障GC模式全分析 · Golang修养之路 · 看云](https://www.kancloud.cn/aceld/golang/1958308)
- [GoLab 2019 \- Fabio Falzoi \- An insight into Go Garbage Collection \- YouTube](https://www.youtube.com/watch?v=etRF1Cpx5Ok)
- [GC 的认识 \- 9\. 什么是写屏障、混合写屏障，如何实现？ \- 《Go 语言问题集\(Go Questions\)》 \- 书栈网 · BookStack](https://www.bookstack.cn/read/qcrao-Go-Questions/spilt.9.GC-GC.md)
- [Go memory ballast: How I learnt to stop worrying and love the heap \| Twitch Blog](https://web.archive.org/web/20210929130001/https://blog.twitch.tv/en/2019/04/10/go-memory-ballast-how-i-learnt-to-stop-worrying-and-love-the-heap-26c2462549a2/)
- [How We Saved 70K Cores Across 30 Mission\-Critical Services \(Large\-cale, Semi\-Automated Go GC Tuning @Uber\)](https://eng.uber.com/how-we-saved-70k-cores-across-30-mission-critical-services/)
- [降本增效: 一种可节约30%CPU资源的tRPC\-Go插件 \- KM平台](https://km.woa.com/articles/show/540132?kmref=search&from_page=1&no=1)
- [go \- Why 'Total MB' in golang heap profile is less than 'RES' in top? \- Stack Overflow](https://stackoverflow.com/questions/16516189/why-total-mb-in-golang-heap-profile-is-less-than-res-in-top)
- [CMS与三色标记算法 \- 知乎](https://zhuanlan.zhihu.com/p/340530051)