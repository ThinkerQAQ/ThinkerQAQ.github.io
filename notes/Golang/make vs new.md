## 1. 是什么
golang的内置函数


## 2. 为什么需要
分配内存空间

值类型的声明之后即可使用

```go
func TestVars(t *testing.T) {
	var i int
	var s string
	fmt.Println(i, s)
}
//输出
0 
```
引用类型的则需要分配空间

```go
func TestVars2(t *testing.T) {
	var i *int
	fmt.Println(i)
	fmt.Println(*i)

}
//输出
<nil>
--- FAIL: TestVars2 (0.00s)
panic: runtime error: invalid memory address or nil pointer dereference [recovered]
	panic: runtime error: invalid memory address or nil pointer dereference
[signal 0xc0000005 code=0x0 addr=0x0 pc=0x5098cf]
```

## 3. 使用
### 3.1. new
开辟一段内存，并置为零值，返回指向该类型内存地址的指针
```go
func TestNew(t *testing.T) {
	var i *int
	i = new(int)
	fmt.Println(*i)
}
//输出
0
```

#### 3.1.1. 相当于&结构体{}

```go
type Stu struct {
	//名字
	name string
}

func testNew() {
	f := new(Stu) //其实就是*f = &Stu{},所以一般不使用new
	f.TestPrintName()
	f.SetName("zsk")
	f.TestPrintName()
}
```

### 3.2. make
用于创建slice、map和channel
开辟一段内存，会初始化而不是置为零值（引用类型零值是nil），返回值类型而不是指针（因为slice、map、channel就是引用类型，没必要返回指向他们的指针了）
```go
func TestMake(t *testing.T) {
	fmt.Println(makeSlice())
}

func makeSlice() []int {
	return make([]int, 0)
}

```





## 4. new vs make

|     |               make               |               new               |
| --- | -------------------------------- | ------------------------------- |
| 作用 | 分配堆内存                       | 分配堆内存                       |
| 参数 | 用于slice、map以及channel的初始化 | 用于类型的内存分配，并且内存置为零 |
| 返回 | 三个引用类型本身                  | 指向类型的指针 |

## 5. 原理

### 5.1. new
```go
func TestNew(t *testing.T) {
	var i *int
	i = new(int)
	fmt.Println(*i)
}
//输出
0
```

- go tool compile -S
```asm
0x0024 00036 (make1_test.go:14)	PCDATA	$0, $1
0x0024 00036 (make1_test.go:14)	PCDATA	$1, $0
0x0024 00036 (make1_test.go:14)	LEAQ	type."".Stu(SB), AX
0x002b 00043 (make1_test.go:14)	PCDATA	$0, $0
0x002b 00043 (make1_test.go:14)	MOVQ	AX, (SP)
0x002f 00047 (make1_test.go:14)	CALL	runtime.newobject(SB)
0x0034 00052 (make1_test.go:14)	PCDATA	$0, $1
0x0034 00052 (make1_test.go:14)	MOVQ	8(SP), AX
```

调用了`runtime.newobject(SB)`


### 5.2. make
```go
func TestMake(t *testing.T) {
	fmt.Println(makeSlice())
}

func makeSlice() []int {
	return make([]int, 0)
}

```
- go tool compile -S
```asm
0x002f 00047 (make1_test.go:13)	PCDATA	$0, $0
0x002f 00047 (make1_test.go:13)	MOVQ	AX, (SP)
0x0033 00051 (make1_test.go:13)	XORPS	X0, X0
0x0036 00054 (make1_test.go:13)	MOVUPS	X0, 8(SP)
0x003b 00059 (make1_test.go:13)	CALL	runtime.makeslice(SB)
0x0040 00064 (make1_test.go:13)	PCDATA	$0, $1
0x0040 00064 (make1_test.go:13)	MOVQ	24(SP), AX
```
调用了`runtime.makeslice(SB)`
## 6. 参考
- [Go语言中new和make的区别 \| 飞雪无情的博客](https://www.flysnow.org/2017/10/23/go-new-vs-make.html)
- [Effective Go \- The Go Programming Language](https://golang.org/doc/effective_go.html#allocation_new)