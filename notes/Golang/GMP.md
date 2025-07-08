
## 1. goroutine调度器
- Golang中协程的调度模型，即有M个线程，N个协程，该怎么分配协程给线程执行
- 这个本质上和操作系统的调度器类似，即有M个处理器，N个线程，怎么分配处理器给线程执行


### 1.1. GM模型
- 最开始采用的是GM模型
    - G：goroutine，M：内核线程
    - 这个模型中，所有的G放在全局队列中，M从全局队列中取出和放回G需要加锁
    - 问题：
        - 加锁效率低
        - 局部性差
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1596870337_20200806231106669_473.png)



### 1.2. GMP模型
- 为了解决GM模型的缺点，推出了GMP模型。M绑定到P，P有个本地队列存放着goroutine，M从中取出goroutine执行；如果P的本地队列为空，那么从全局队列或者其他P偷取
- 一句话：m 需要获得 p 才能运行 g
- ![](https://raw.githubusercontent.com/TDoct/images/master/1596870339_20200808144742151_25089.png)

#### 1.2.1. P
- Processor，抽象的处理器。
- `GOMAXPROCS`环境变量或者`runtime.GOMAXPROCS()`设置的是会有多少个操作系统的线程同时执行Go的代码，即GMP中P的数量。
#### 1.2.2. M
- Machine，内核线程。
- 数量由go语言设置，默认为1W个，可以通过`runtime/debug的SetMaxThreads`设置
- 如果有一个M阻塞，那么会创建新的M
- 如果有M空闲，那么这个M会被回收或者睡眠
#### 1.2.3. G
- Goroutine，协程。
- 执行用户代码
- `runtime.NumGoroutine()`获取当前总的协程数量，即GMP中的G
- 也可以通过[pprof.md](pprof.md)来获取G的数量






## 2. 调度器创建goroutine流程
![](https://raw.githubusercontent.com/TDoct/images/master/1596870369_20200808150400637_4230.png)


### 2.1. 初始化M0和G0
- M0
    - 启动程序后的**编号为0**的主线程
    - 负责执行初始化操作和**启动第一个G**
- G0
    - 每次启动一个新的M，都会创建一个G,这个**第一个创建的G**就是G0
    - 作用
        - 用于调度在M上执行的其他goroutine
        - 用于创建其他goroutine
        - 用于执行gc
        - 用于栈扩容

### 2.2. go func执行流程
![](https://raw.githubusercontent.com/TDoct/images/master/1596870366_20200808150211834_12928.png)



## 3. 抢占式调度
最开始协程由用户态调度是协作式的，一个协程让出CPU后，才执行下一个协程；后来为了防止一个goroutine运行时间过长，改成抢占式
抢占时机：
- 只有长时间阻塞于系统调用，或者运行了较长时间才会被抢占
- runtime会在后台有一个检测线程，它会检测这些情况，并通知goroutine执行调度


## 4. 参考
- [\[典藏版\] Golang 调度器 GMP 原理与调度全分析 \| Go 技术论坛](https://learnku.com/articles/41728)
- [Go: g0, Special Goroutine\. ℹ️ This article is based on Go 1\.13\. \| by Vincent Blanchon \| A Journey With Go \| Medium](https://medium.com/a-journey-with-go/go-g0-special-goroutine-8c778c6704d8)
- [抢占式调度 · 深入解析Go](https://tiancaiamao.gitbooks.io/go-internals/content/zh/05.5.html)
- [Go 运行程序中的线程数 \| 鸟窝](https://colobu.com/2020/12/20/threads-in-go-runtime/#:~:text=%E4%BD%86%E6%98%AF%EF%BC%8C%E7%B3%BB%E7%BB%9F%E7%9A%84%E7%BA%BF%E7%A8%8B%E4%B9%9F,%E9%BB%98%E8%AE%A4%E6%98%AF10000%E4%B8%AA%E7%BA%BF%E7%A8%8B%E3%80%82)