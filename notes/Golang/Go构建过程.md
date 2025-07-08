## 1. 文本文件
```go
package main

import "fmt"

func main() {
	fmt.Println("hello world")
}
```
保存之后这个文件以二进制形式存储在磁盘中
使用vim打开，敲入`:%!xxd`
![](https://raw.githubusercontent.com/TDoct/images/master/1598065626_20200822104115315_1326.png)
最左边的地址列，中间是文本字符对应的十六进制ASCII编码，最右边是文本字符。
ASCII表可以通过`man ascii`查询

像这种把二进制通过字符表转换成人类可读的文件叫做文本文件，不可读的就是二进制文件（如图片、视频等）
## 2. 构建可执行文件过程
这个源文件经过编译、汇编、链接等一系列步骤转换成可执行的目标文件



 ![](https://raw.githubusercontent.com/TDoct/images/master/1598065627_20200822105125450_24436.png)

## 3. 编译

Go的编译器源码
![](https://raw.githubusercontent.com/TDoct/images/master/1598065629_20200822105702373_1716.png)
编译器可执行文件
![](https://raw.githubusercontent.com/TDoct/images/master/1598065630_20200822105713091_3310.png)

### 3.1. 编译过程

#### 3.1.1. 前端
![](https://raw.githubusercontent.com/TDoct/images/master/1598065634_20200822110044404_3500.png)
##### 3.1.1.1. 词法分析
Scanner将字符序列转换为标记（token）序列的过程。
Go中所有token位于
![](https://raw.githubusercontent.com/TDoct/images/master/1598065636_20200822110525528_29473.png)
Scanner源码位于
![](https://raw.githubusercontent.com/TDoct/images/master/1598065638_20200822110621261_3601.png)
最关键的是Next函数

```go
func (s *scanner) next() {
// ……

redo:
	// 获取下一个未被解析的字符，并且会跳过之后的空格、回车、换行、tab 字符
	c := s.getr()
	for c == ' ' || c == '\t' || c == '\n' && !nlsemi || c == '\r' {
		c = s.getr()
	}

	// token start
	s.line, s.col = s.source.line0, s.source.col0

	if isLetter(c) || c >= utf8.RuneSelf && s.isIdentRune(c, true) {
		s.ident()
		return
	}

    //进入一个大的 switch-case 语句，匹配各种不同的情形，最终可以解析出一个 Token，并且把相关的行、列数字记录下来，这样就完成一次解析过程
	switch c {
    // ……

	case '\n':
		s.lit = "newline"
		s.tok = _Semi

	case '0', '1', '2', '3', '4', '5', '6', '7', '8', '9':
		s.number(c)
		
	// ……
	
   default:
		s.tok = 0
		s.error(fmt.Sprintf("invalid character %#U", c))
		goto redo
	return

assignop:
	if c == '=' {
		s.tok = _AssignOp
		return
	}
	s.ungetr()
	s.tok = _Operator
}
```

##### 3.1.1.2. 语法分析
Token 序列转换成一棵以表达式为结点的语法树。
比如`slice[i] = i * (2 + 6)`
![](https://raw.githubusercontent.com/TDoct/images/master/1598066131_20200822111342437_21000.png)

##### 3.1.1.3. 语义分析
语法正确不代表语义正确，比如`指针*指针`这个语句语法正确但是语义不正确。
Go的语义检查主要是类型检查以及抽象语法树改写

#### 3.1.2. 后端
将语法树转换成中间代码，中间代码一般和目标机器以及运行时环境无关，它有几种常见的形式：三地址码、P-代码。
Go的表示形式为SSA
![](https://raw.githubusercontent.com/TDoct/images/master/1598068563_20200822112408245_9151.png)
## 4. 链接
把编译器生成的一个个目标文件链接成可执行文件，最终得到的文件是分成各种段的，比如数据段、代码段、BSS段等等，运行时会被装载到内存中

连接器源码
![](https://raw.githubusercontent.com/TDoct/images/master/1598065633_20200822105934292_2682.png)
连接器可执行文件
![](https://raw.githubusercontent.com/TDoct/images/master/1598065631_20200822105825465_27584.png)


## 5. Go引导流程
### 5.1. 使用GDB
对于上述的helloworld文件，使用`go build -gcflags "-N -l" -o hello hello.go`编译，敲入`gdb hello`进入调试模式，执行`info files`
![](https://raw.githubusercontent.com/TDoct/images/master/1598068567_20200822113055579_497.png)
可以看出入口地址为`0x4568e0`，敲入`b *0x4568e0`
![](https://raw.githubusercontent.com/TDoct/images/master/1598068569_20200822113556471_10435.png)
可以看出入口文件为` C:/software/Go/src/runtime/rt0_windows_amd64.s`，如下

```asm
TEXT _rt0_amd64_windows(SB),NOSPLIT,$-8
	JMP	_rt0_amd64(SB) #跳转到TEXT _rt0_amd64_windows_lib_go(SB),NOSPLIT,$0
```

继续`b _rt0_amd64`
![](https://raw.githubusercontent.com/TDoct/images/master/1599834884_20200911220831872_2980.png)
可以看出`_rt0_amd64`跳转到`C:/software/Go/src/runtime/asm_amd64.s, line 15`，如下
```asm
TEXT _rt0_amd64(SB),NOSPLIT,$-8
	MOVQ	0(SP), DI	// argc
	LEAQ	8(SP), SI	// argv
	JMP	runtime·rt0_go(SB)
```
继续`b runtime·rt0_go`
![](https://raw.githubusercontent.com/TDoct/images/master/1599834885_20200911221032821_18982.png)
`runtime·rt0_go`跳转到`C:/software/Go/src/runtime/asm_amd64.s, line 89`，如下

```asm
TEXT runtime·rt0_go(SB),NOSPLIT,$0
    #......
    # 初始化执行文件的绝对路径
	CALL	runtime·args(SB)
	# 初始化 CPU 个数和内存页大小
	CALL	runtime·osinit(SB)
	# 初始化命令行参数、环境变量、gc、栈空间、内存管理、所有 P 实例、HASH算法等
	CALL	runtime·schedinit(SB)

	// 要在 main goroutine 上运行的函数
	MOVQ	$runtime·mainPC(SB), AX		// entry
	PUSHQ	AX
	PUSHQ	$0			// arg size
	// 新建一个 goroutine，该 goroutine 绑定 runtime.main，放在 P 的本地队列，等待调度
	CALL	runtime·newproc(SB)
	POPQ	AX
	POPQ	AX

	// 启动M，开始调度goroutine
	CALL	runtime·mstart(SB)

	CALL	runtime·abort(SB)	
	RET

	MOVQ	$runtime·debugCallV1(SB), AX
	RET

DATA	runtime·mainPC+0(SB)/8,$runtime·main(SB)
GLOBL	runtime·mainPC(SB),RODATA,$8
```

我们继续看看初始化过程的三大函数`runtime·args、runtime·osinit、runtime·schedinit`
![](https://raw.githubusercontent.com/TDoct/images/master/1599834887_20200911222126799_14651.png)
runtime1.go line 60
```go
func args(c int32, v **byte) {
    //整理命令行参数
	argc = c
	argv = v
	sysargs(c, v)
}
```
os_windows.go line 389
```go
func osinit() {
	asmstdcallAddr = unsafe.Pointer(funcPC(asmstdcall))
	usleep2Addr = unsafe.Pointer(funcPC(usleep2))
	switchtothreadAddr = unsafe.Pointer(funcPC(switchtothread))

	setBadSignalMsg()

	loadOptionalSyscalls()

	disableWER()

	initExceptionHandler()

	stdcall2(_SetConsoleCtrlHandler, funcPC(ctrlhandler), 1)

	timeBeginPeriodRetValue = osRelax(false)

    //确定 CPU Core 数量
	ncpu = getproccount()

	physPageSize = getPageSize()

	stdcall2(_SetProcessPriorityBoost, currentProcess, 1)
}
```

proc.go line 529

```go
func schedinit() {
	// raceinit must be the first call to race detector.
	// In particular, it must be done before mallocinit below calls racemapshadow.
	_g_ := getg()
	if raceenabled {
		_g_.racectx, raceprocctx0 = raceinit()
	}

    //最大系统线程数量限制
	sched.maxmcount = 10000

	tracebackinit()
	moduledataverify()
	//栈初始化
	stackinit()
	//内存分配器初始化
	mallocinit()
	调度器相关初始化
	mcommoninit(_g_.m)
	cpuinit()       // must run before alginit
	alginit()       // maps must not be used before this call
	modulesinit()   // provides activeModules
	typelinksinit() // uses maps, activeModules
	itabsinit()     // uses activeModules

	msigsave(_g_.m)
	initSigmask = _g_.m.sigmask

    //处理命令行参数和环境变量
	goargs()
	goenvs()
	//处理GODEBUG、GOTRACEBACK调试相关的环境变量设置
	parsedebugvars()
	//垃圾回收期初始化
	gcinit()

	sched.lastpoll = uint64(nanotime())
	//确定P的数量。由CPU Core和GOMAXPROCS环境变量确定
	procs := ncpu
	if n, ok := atoi32(gogetenv("GOMAXPROCS")); ok && n > 0 {
		procs = n
	}
	//调整P数量
	if procresize(procs) != nil {
		throw("unknown runnable goroutine during bootstrap")
	}

	// For cgocheck > 1, we turn on the write barrier at all times
	// and check all pointer writes. We can't do this until after
	// procresize because the write barrier needs a P.
	if debug.cgocheck > 1 {
		writeBarrier.cgo = true
		writeBarrier.enabled = true
		for _, p := range allp {
			p.wbBuf.reset()
		}
	}

	if buildVersion == "" {
		// Condition should never trigger. This code just serves
		// to ensure runtime·buildVersion is kept in the resulting binary.
		buildVersion = "unknown"
	}
	if len(modinfo) == 1 {
		// Condition should never trigger. This code just serves
		// to ensure runtime·modinfo is kept in the resulting binary.
		modinfo = ""
	}
}
```

初始化完成之后会调用`runtime.main`
![](https://raw.githubusercontent.com/TDoct/images/master/1599834888_20200911223439887_22237.png)

```go
func main() {
	g := getg()

	// Racectx of m0->g0 is used only as the parent of the main goroutine.
	// It must not be used for anything else.
	g.m.g0.racectx = 0

	//栈大小限制
	if sys.PtrSize == 8 {
	    //64 bit上是1GB
		maxstacksize = 1000000000
	} else {
	    //32 bit上是250MB
		maxstacksize = 250000000
	}

	// Allow newproc to start new Ms.
	mainStarted = true

	if GOARCH != "wasm" { // no threads on wasm yet, so no sysmon
		//启动系统后台监控（定期垃圾回收、并发调度任务相关）
		systemstack(func() {
			newm(sysmon, nil)
		})
	}

	// Lock the main goroutine onto this, the main OS thread,
	// during initialization. Most programs won't care, but a few
	// do require certain calls to be made by the main thread.
	// Those can arrange for main.main to run in the main thread
	// by calling runtime.LockOSThread during initialization
	// to preserve the lock.
	lockOSThread()

	if g.m != &m0 {
		throw("runtime.main not on m0")
	}

    //执行runtime包内所有初始化函数init
	doInit(&runtime_inittask) // must be before defer
	if nanotime() == 0 {
		throw("nanotime returning zero")
	}

	// Defer unlock so that runtime.Goexit during init does the unlock too.
	needUnlock := true
	defer func() {
		if needUnlock {
			unlockOSThread()
		}
	}()

	// Record when the world started.
	runtimeInitTime = nanotime()

    //执行垃圾回收器后台操作
	gcenable()

	main_init_done = make(chan bool)
	if iscgo {
		if _cgo_thread_start == nil {
			throw("_cgo_thread_start missing")
		}
		if GOOS != "windows" {
			if _cgo_setenv == nil {
				throw("_cgo_setenv missing")
			}
			if _cgo_unsetenv == nil {
				throw("_cgo_unsetenv missing")
			}
		}
		if _cgo_notify_runtime_init_done == nil {
			throw("_cgo_notify_runtime_init_done missing")
		}
		// Start the template thread in case we enter Go from
		// a C-created thread and need to create a new thread.
		startTemplateThread()
		cgocall(_cgo_notify_runtime_init_done, nil)
	}

    //执行除runtime包的其他所有包的初始化函数init
	doInit(&main_inittask)

	close(main_init_done)

	needUnlock = false
	unlockOSThread()

	if isarchive || islibrary {
		// A program compiled with -buildmode=c-archive or c-shared
		// has a main, but it is not executed.
		return
	}
	//执行main.main函数
	fn := main_main // make an indirect call, as the linker doesn't know the address of the main package when laying down the runtime
	fn()
	if raceenabled {
		racefini()
	}

	// Make racy client program work: if panicking on
	// another goroutine at the same time as main returns,
	// let the other goroutine finish printing the panic trace.
	// Once it does, it will exit. See issues 3934 and 20018.
	if atomic.Load(&runningPanicDefers) != 0 {
		// Running deferred functions should not take long.
		for c := 0; c < 1000; c++ {
			if atomic.Load(&runningPanicDefers) == 0 {
				break
			}
			Gosched()
		}
	}
	if atomic.Load(&panicking) != 0 {
		gopark(nil, nil, waitReasonPanicWait, traceEvGoStop, 1)
	}

    //执行结束，返回退出状态码
	exit(0)
	for {
		var x *int32
		*x = 0
	}
}
```
### 5.2. 使用go tool

`go tool objdump  hello > hello.asm`
### 5.3. 整体流程图
![](https://raw.githubusercontent.com/TDoct/images/master/1598068571_20200822114049119_32199.png)


## 6. Go启动流程

- runtime.rt0_go
    - 运行时类型检查
    - 确定了两个很重要的运行时常量，即处理器核心数以及内存物理页大小
- schedinit
    - 完成整个程序运行时的初始化，包括调度器、执行栈、内存分配器、调度器、垃圾回收器等组件的初始化


### 6.1. g0
- runtime·rt0_go 里会给main thread的 g0 分配栈空间
- main thread与m0绑定，m0又与g0绑定，再与p0绑定。这样GPM就运行起来了
- 创建main goroutine，放入p0的本地待运行队列中，最后通过schedule函数进入调度
- 执行到main.main的时候，如果有一行代码是
```go
go func() {
    // 要做的事
}()
```
- 这时就会启动一个goroutine，最终会转换成newproc函数
    - g0栈上调用newproc1函数
- 将新建的goroutine放入p的本地待运行队列

## 7. 参考
- [Go 程序是怎样跑起来的 \| qcrao](https://qcrao.com/2019/07/03/how-go-runs/#%E8%AF%8D%E6%B3%95%E5%88%86%E6%9E%90)
- [5\.3 Go 程序启动引导 \| Go 语言原本](https://changkun.de/golang/zh-cn/part1basic/ch05life/boot/)