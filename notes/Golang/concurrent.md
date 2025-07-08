
## 1. 有什么
### 1.1. goroutine+channel
- [goroutine.md](goroutine.md)
- [channel.md](channel.md)
### 1.2. sync包
[sync.md](sync.md)
## 2. 同步
### 2.1. 顺序一致性模型
同一个Goroutine线程内部，顺序一致性内存模型是得到保证的
### 2.2. happens-before
不同的Goroutine之间，并不满足顺序一致性内存模型，需要通过明确定义的同步事件来作为同步的参考


#### 2.2.1. channel
- buffered channel: `ch <- v` **≤**  `v <- ch`
    - 解释：发送数据到buffered channel **happens before **从buffered channel中接收数据
    - 即需要writer先生产数据，丢入channel中；reader才能从channel中消费数据
- unbuffered channel:  `v <- ch` **≤**  `ch <- v`
    - 解释：从unbuffered channel中接收数据 **happens before** 发送数据到unbuffered channel
    - 即reader从channel中读取数据，会一直阻塞到writer往channel生产数据
## 3. 并发模式
- [扇入扇出 · Concurrency in Go 中文笔记 · 看云](https://www.kancloud.cn/mutouzhang/go/596844)
## 4. 多核CPU
[Go语言多核并行化](http://c.biancheng.net/view/4362.html?utm_source=pocket_saves)
[PythonWise: CPU Affinity in Go](http://pythonwise.blogspot.com/2019/03/cpu-affinity-in-go.html?utm_source=pocket_saves)
[tsingson/cpuaffinity: pin goroutine to cpu core as thread](https://github.com/tsingson/cpuaffinity?utm_source=pocket_saves)
## 5. 参考
- [1\.5 面向并发的内存模型 · Go语言高级编程](https://chai2010.gitbooks.io/advanced-go-programming-book/content/ch1-basic/ch1-05-mem.html)
- [The Go Memory Model \- The Go Programming Language](https://golang.org/ref/mem)
- [Effective Go \- The Go Programming Language](https://golang.org/doc/effective_go.html#concurrency)
- [The Go Memory Model \- The Go Programming Language](https://golang.org/ref/mem)