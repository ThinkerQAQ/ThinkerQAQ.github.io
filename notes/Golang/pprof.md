## 1. pprof是什么
Golang的性能分析工具。

## 2. 如何使用pprof
有两个库：
`runtime/pprof`：采集工具型应用运行数据进行分析
`net/http/pprof`：采集web应用运行时数据进行分析
`benchmark`：压测
### 2.1. runtime/pprof
#### 2.1.1. CPU分析
假设应用如下：
```go
import (
	"fmt"
	"time"
)

// 一段有问题的代码
func logicCode() {
	var c chan int
	for {
		select {
		case v := <-c:
			fmt.Printf("recv from chan, value:%v\n", v)
		default:
		}
	}
}

func main() {
	for i := 0; i < 8; i++ {
		go logicCode()
	}
	time.Sleep(20 * time.Second)
}

```
如果要开启CPU分析，那么步骤如下：
1. 导入包`import "runtime/pprof"`
2. 开启CPU性能分析：`pprof.StartCPUProfile(w io.Writer)`+停止CPU性能分析：`pprof.StopCPUProfile()`
代码如下
```go
import (
	"fmt"
	"os"
	"runtime/pprof"
	"time"
)

// 一段有问题的代码
func logicCode() {
	var c chan int
	for {
		select {
		case v := <-c:
			fmt.Printf("recv from chan, value:%v\n", v)
		default:
		}
	}
}

func main() {
	//开启CPU分析
	file, err := os.Create("./cpu.pprof")
	if err != nil {
		fmt.Printf("create cpu pprof failed, err:%v\n", err)
		return
	}
	pprof.StartCPUProfile(file)
	defer pprof.StopCPUProfile()

	for i := 0; i < 8; i++ {
		go logicCode()
	}
	time.Sleep(20 * time.Second)
}

```

3.  运行代码生成报告
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1618715360_20210418110917262_19995.png)
4. 命令行分析
    - `go tool pprof cpu.pprof`
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1618715064_20210418110029954_14854.png)
    - 几个比较重要的命令：
        - `top`：找出我们写的代码中占用CPU高的函数
            - ![](https://raw.githubusercontent.com/TDoct/images/master/1618715065_20210418110053469_7514.png)
                - flat：当前函数占用CPU的耗时。举例来说，`runtime.selectnbrecv`这个函数的耗时占用了56.08s，**不包括调用子函数**
                - flat%：:当前函数占用CPU的耗时百分比。举例来说，`runtime.selectnbrecv`这个函数的耗时占用了CPU48.75%的时间，**不包括调用子函数**
                - sum%：该函数及以上函数占用CPU的耗时累计百分比，即flat%的累加。举例来说，`mainlogicCode`及以上的函数占用了48.75+34.60+16.06=99.41%的时间
                - cum：当前函数加上当前函数调用的函数占用CPU的总耗时。举例来说，`runtime.selectnbrecv`这个函数的耗时占用了96.02s，**包括调用子函数**。可以使用`top -cum`按照cum排序
                - cum%：当前函数加上调用当前函数的函数占用CPU的总耗时百分比。举例来说，`runtime.selectnbrecv`这个函数的耗时占用了CPU83.47%的时间，**包括调用子函数**
                - 最后一列：函数名称
        - `list函数名`：查看源代码
            - ![](https://raw.githubusercontent.com/TDoct/images/master/1618715065_20210418110421512_11906.png)
        - `web`：图形化方式查看报告(需要安装graphviz)
            - ![](https://raw.githubusercontent.com/TDoct/images/master/1618715226_20210418110639068_19599.png)
            - ![](https://raw.githubusercontent.com/TDoct/images/master/1618715226_20210418110703487_13579.png)
                - Edge：调用
                    - 代表A调用B，其中虚线表示省略了中间一些不重要的函数调用
                    - 连线上的值表示该子函数耗时
                - Node：函数
                    - CPU占用时间越多那么图形越大越红
                    - main.logicCode函数本身占用了18.47s，占比16.06%，该函数以及子函数占用了114.49s，占比99.52%
5. 浏览器分析
    - `go tool pprof -http=:9090 cpu.pprof`
    - 其中的![](https://raw.githubusercontent.com/TDoct/images/master/1648297530_20220326202525980_3227.png)[火焰图.md](../Operating_System/Linux/性能调优/火焰图.md)特别有用
6. 修改代码
```go
func logicCode() {
	var c chan int
	for {
		select {
		case v := <-c:
			fmt.Printf("recv from chan, value:%v\n", v)
		default:
			time.Sleep(time.Second)
		}
	}
}
```
7. 重新运行分析
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1618715754_20210418111531227_31758.png)
    - 可以看出没有我们写的代码占用高的情况了
#### 2.1.2. 内存分析

步骤如下
1. 导入包：`import "runtime/pprof"`
2. 记录程序的堆栈信息：`pprof.WriteHeapProfile(w io.Writer)`
代码如下：
```go
port (
	"fmt"
	"os"
	"runtime/pprof"
	"time"
)

func main() {
	//开启内存分析
	file, err := os.Create("./memory.pprof")
	if err != nil {
		fmt.Printf("create cpu pprof failed, err:%v\n", err)
		return
	}
	pprof.WriteHeapProfile(file)

	for i := 0; i < 8; i++ {
		go logicCode()
	}
	time.Sleep(20 * time.Second)
}

```

3. 运行代码生成报告
    -  ![](https://raw.githubusercontent.com/TDoct/images/master/1618716798_20210418113314347_31046.png)
4. 命令行分析
    - `go tool pprof -inuse_space memory.pprof `
    - `go tool pprof -inuse_objects memory.pprof `

[Golang内存泄露.md](Golang内存泄露.md)


#### 2.1.3. 阻塞分析
[In the Go programming language, what happens when a goroutine blocks? \- Quora](https://www.quora.com/In-the-Go-programming-language-what-happens-when-a-goroutine-blocks)

### 2.2. net/http/pprof
假设Web应用如下：
```go
func main() {
	go func() {
		http.ListenAndServe("0.0.0.0:9999", nil)
	}()
}
```
如果要开启分析，那么步骤如下：
1. 导入包：`import _ "net/http/pprof"`
```go
import _ "net/http/pprof"
func main() {
	go func() {
		http.ListenAndServe("0.0.0.0:9999", nil)
	}()
}
```
2. 使用浏览器访问`http://127.0.0.1:9999/debug/pprof/`
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1598453934_20200826175205433_17389.png)
    - 点击不同端点查看
        - 内存：`allocs`、`heap`
        - CPU：`profile`
        - 线程：`threadcreate`
        - 协程：`goroutine`
3. 除了用浏览器实时查看外，也可以用`go tool pprof`查看不同端点
```go
go tool pprof http://localhost:9999/debug/pprof/allocs
go tool pprof http://localhost:9999/debug/pprof/heap
go tool pprof http://localhost:9999/debug/pprof/goroutine
go tool pprof http://localhost:9999/debug/pprof/threadcreate
go tool pprof http://localhost:9999/debug/pprof/profile
```
4. 也可以保存当时的快照以便以后分析
```curl
curl http://localhost:9999/debug/pprof/allocs > allocs.out
curl http://localhost:9999/debug/pprof/heap > heap.out
curl http://localhost:9999/debug/pprof/goroutine > goroutine.out
curl http://localhost:9999/debug/pprof/threadcreate > threadcreate.out
curl http://localhost:9999/debug/pprof/profile > profile.out
```
然后用`go tool pprof`分析，同工具型应用

### 2.3. benchmark
[benchmark.md](benchmark.md)
## 3. pprof原理
采样：开启之后每隔一段时间（10ms）收集堆栈信息，获取每个函数占用的CPU和内存等资源，
分析：通过对这些采样数据进行分析，形成一个性能分析报告

## 4. 参考
- [深度解密Go语言之pprof \| qcrao](https://qcrao.com/2019/11/10/dive-into-go-pprof/)
- [Golang 大杀器之性能剖析 PProf \- SegmentFault 思否](https://segmentfault.com/a/1190000016412013)
- [Go性能调优 \| 李文周的博客](https://www.liwenzhou.com/posts/Go/performance_optimisation/)
- [go pprof实战 \- QQ音乐项目 \- KM平台](https://km.woa.com/group/34300/articles/show/469962?kmref=search&from_page=1&no=1)
- [内存泄漏，8次goroutine泄漏，1次真正内存泄漏 \- rsapaper\_ing \- 博客园](https://www.cnblogs.com/rsapaper/p/15208841.html)
- [golang pprof 实战 \| Wolfogre's Blog](https://blog.wolfogre.com/posts/go-ppof-practice/)
- [go pprof实战 \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1823588)
- [一文搞懂pprof\_程序员麻辣烫的博客\-CSDN博客\_pprof](https://blog.csdn.net/shida219/article/details/116709430)
- [降本增效: 一种可节约30%CPU资源的tRPC\-Go插件 \- KM平台](https://km.woa.com/articles/show/540132?kmref=search&from_page=1&no=2)
- [tRPC\-Go: 性能优化之路 \- KM平台](https://km.woa.com/articles/show/428762?kmref=search&from_page=1&no=1)
- [How I investigated memory leaks in Go using pprof on a large codebase](https://www.freecodecamp.org/news/how-i-investigated-memory-leaks-in-go-using-pprof-on-a-large-codebase-4bec4325e192/)
- [An Introduction to go tool trace](https://about.sourcegraph.com/go/an-introduction-to-go-tool-trace-rhys-hiltner/)
- [pprof中flat和cum的区别\_i\-neojos的博客\-CSDN博客](https://blog.csdn.net/whynottrythis/article/details/108765944)
- [linux \- Pprof and golang \- how to interpret a results? \- Stack Overflow](https://stackoverflow.com/questions/32571396/pprof-and-golang-how-to-interpret-a-results)
- [Profiling and Optimizing Go \- YouTube](https://www.youtube.com/watch?v=N3PWzBeLX2M)
- [Go Profiling and Optimization \- Google 幻灯片](https://docs.google.com/presentation/d/1n6bse0JifemG7yve0Bb0ZAC-IWhTQjCNAclblnn2ANY/present?slide=id.g3a3e2af65_029)
- [Commits · prashantv/go\_profiling\_talk](https://github.com/prashantv/go_profiling_talk/commits/master)
- [\[golang\]7种 Go 程序性能分析方法 \- landv \- 博客园](https://www.cnblogs.com/landv/p/11274877.html)
- [golang 内存分析/动态追踪 — 源代码](https://lrita.github.io/2017/05/26/golang-memory-pprof/)