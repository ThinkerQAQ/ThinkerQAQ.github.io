## 1. 是什么
- panic是内置函数，可以停止正常的流程。
- recover是内置函数，可以捕获到panic，recover只在defer函数中有用。
## 2. 为什么需要
- panic一般用于不可恢复的错误，让程序不能继续进行
- recover为了防止panic之后整个进程都down掉，这个时候就需要recover恢复
## 3. 使用

```go
func TestPanic1(t *testing.T) {
	defer func() {
		if err := recover(); err != nil {
			fmt.Println("program panic. err=", err)
		}
	}()
	panic("程序崩溃")
}

//输出
program panic. err= 程序崩溃
```

## 4. 原理

```go
func TestPanic1(t *testing.T) {
	defer func() {
		if err := recover(); err != nil {
			fmt.Println("program panic. err=", err)
		}
	}()
	panic("程序崩溃")
}

//输出
program panic. err= 程序崩溃
```

- go tool compile -S
```asm
0x0024 00036 (panic1_test.go:9)	PCDATA	$0, $0
0x0024 00036 (panic1_test.go:9)	PCDATA	$1, $0
0x0024 00036 (panic1_test.go:9)	MOVL	$0, ""..autotmp_2+16(SP)
0x002c 00044 (panic1_test.go:9)	PCDATA	$0, $1
0x002c 00044 (panic1_test.go:9)	LEAQ	"".TestPanic1.func1·f(SB), AX
0x0033 00051 (panic1_test.go:9)	PCDATA	$0, $0
0x0033 00051 (panic1_test.go:9)	MOVQ	AX, ""..autotmp_2+40(SP)
0x0038 00056 (panic1_test.go:9)	PCDATA	$0, $1
0x0038 00056 (panic1_test.go:9)	LEAQ	""..autotmp_2+16(SP), AX
0x003d 00061 (panic1_test.go:9)	PCDATA	$0, $0
0x003d 00061 (panic1_test.go:9)	MOVQ	AX, (SP)
0x0041 00065 (panic1_test.go:9)	CALL	runtime.deferprocStack(SB)
0x0046 00070 (panic1_test.go:9)	TESTL	AX, AX
0x0048 00072 (panic1_test.go:9)	JNE	102
0x004a 00074 (panic1_test.go:14)	PCDATA	$0, $1
0x004a 00074 (panic1_test.go:14)	LEAQ	type.string(SB), AX
0x0051 00081 (panic1_test.go:14)	PCDATA	$0, $0
0x0051 00081 (panic1_test.go:14)	MOVQ	AX, (SP)
0x0055 00085 (panic1_test.go:14)	PCDATA	$0, $1
0x0055 00085 (panic1_test.go:14)	LEAQ	""..stmp_0(SB), AX
0x005c 00092 (panic1_test.go:14)	PCDATA	$0, $0
0x005c 00092 (panic1_test.go:14)	MOVQ	AX, 8(SP)
0x0061 00097 (panic1_test.go:14)	CALL	runtime.gopanic(SB)
0x0066 00102 (panic1_test.go:9)	XCHGL	AX, AX
0x0067 00103 (panic1_test.go:9)	CALL	runtime.deferreturn(SB)
0x006c 00108 (panic1_test.go:9)	MOVQ	72(SP), BP
0x0071 00113 (panic1_test.go:9)	ADDQ	$80, SP
0x0075 00117 (panic1_test.go:9)	RET
0x0028 00040 (panic1_test.go:10)	PCDATA	$0, $1
0x0028 00040 (panic1_test.go:10)	PCDATA	$1, $0
0x0028 00040 (panic1_test.go:10)	LEAQ	""..fp+112(SP), AX
0x002d 00045 (panic1_test.go:10)	PCDATA	$0, $0
0x002d 00045 (panic1_test.go:10)	MOVQ	AX, (SP)
0x0031 00049 (panic1_test.go:10)	CALL	runtime.gorecover(SB)
0x0036 00054 (panic1_test.go:10)	PCDATA	$0, $1
0x0036 00054 (panic1_test.go:10)	MOVQ	16(SP), AX
0x003b 00059 (panic1_test.go:10)	MOVQ	8(SP), CX
0x0040 00064 (panic1_test.go:10)	TESTQ	CX, CX
0x0043 00067 (panic1_test.go:10)	JNE	79
```

- panic调用的是`runtime.gopanic(SB)`
- recover调用的是`runtime.gorecover(SB)`

## 5. 参考
- [【翻译】【Go】了解Defer、Panic、Recover \- 掘金](https://juejin.im/post/6844903902853201927)
- [深入理解Go\-defer的原理剖析 \- 掘金](https://juejin.im/post/6844903936508297223)
- [Go 语言 panic 和 recover 的原理 \| Go 语言设计与实现](https://draveness.me/golang/docs/part2-foundation/ch05-keyword/golang-panic-recover/)
- [\[译\] Part 32: golang 中的 panic 和 recover \- 掘金](https://juejin.im/post/6844903810201026567)