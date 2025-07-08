## 1. 什么是defer
让函数可以在当前函数执行完毕后执行的一种机制。
这里的函数执行完毕包括通过return正常结束或者panic导致的异常结束

## 2. 为什么需要defer
减少资源泄露的发生

## 3. 如何使用
在创建资源语句的附件，使用defer释放资源

### 3.1. 关闭资源

```go
func TestDefer(t *testing.T) {
	f,err := os.Open("test.txt")
	//先处理error
	if err != nil {
		panic(err)
	}
	//记得判断f是否为空
	if f != nil {
		defer f.Close()
	}

}

```

### 3.2. defer和return
#### 3.2.1. 执行顺序
defer是在return之前执行，顺序是：

- 返回值 = xxx
- 调用defer函数
- 空的return


#### 3.2.2. 例子1
```go
func f() (result int) {
    defer func() {
        result++
    }()
    return 0
}

func TestDefer0(t *testing.T) {
	fmt.Println(f())
}
//输出
1
```

- return 0改写为result = 0 和 return

```go
func f() (result int) {
	result = 0  //return语句不是一条原子调用，return xxx其实是赋值＋ret指令
	func() { //defer被插入到return之前执行，也就是赋返回值和ret指令之间
		result++
	}()
	return
}
//输出
1
```

#### 3.2.3. 例子2

```go
func TestDefer1(t *testing.T) {
	fmt.Println(f1())
}

// 跟上例的区别在于返回值没有明确命名
func f1() int {
	t := 5
	defer func() {
		t = t + 5
	}()

	return t
}

//输出
5
```
- return t改写为r = t 和 return

```go

func f1() (r int) {
     t := 5
     r = t //赋值指令
     func() {        //defer被插入到赋值与返回之间执行，这个例子中返回值r没被修改过
         t = t + 5
     }
     return        //空的return指令
}

```

#### 3.2.4. 例子3

```go

func f2() (r int) {
	defer func(r int) {
		r = r + 5
	}(r)
	return 1
}

func TestDefer2(t *testing.T) {
	fmt.Println(f4())
}


//输出
1
```

- return 1改写成 r = 1 和 return

```go
func f2() (r int) {
     r = 1  //给返回值赋值
     func(r int) {        //这里改的r是传值传进去的r，不会改变要返回的那个r值
          r = r + 5
     }(r)
     return        //空的return
}

```
### 3.3. 多个defer按顺序压入栈中

#### 3.3.1. 普通传参

```go
func TestDefer3(t *testing.T) {
	for i := 0; i < 10; i++ {
		defer fmt.Println(i) 
	}

	fmt.Println("退出了，执行defer")
}

//输出
退出了，执行defer
9
8
7
6
5
4
3
2
1
0
```
那么为什么是一个栈呢？后面定义的函数可能会依赖前面的资源，自然要先执行；否则，如果前面先执行，那后面函数的依赖就没有了

#### 3.3.2. defer+闭包

上面的代码如果改成闭包形式那么输出结果会不一样

```go
func TestDefer4(t *testing.T) {
	for i := 0; i < 10; i++ {
		defer func() {
			fmt.Println(i)
		}()
	}

	fmt.Println("退出了，执行defer")
}

//输出
退出了，执行defer
10
10
10
10
10
10
10
10
10
10
```


### 3.4. defer配合recover
如果程序有异常会panic，panic会停止当前应用程序而不仅是当前协程，如果要在panic后的程序进行一些资源的收尾处理，需要用defer+recover

```go
func TestDefer5(t *testing.T) {
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
func TestDefer6(t *testing.T) {
	test()
}

func test() {
	var i = 0
	defer func() {
		i++
	}()
	return
}
```

- go tool compile -S
```asm
0x0054 00084 (defer1_test.go:13)	CALL	runtime.deferprocStack(SB)
0x0059 00089 (defer1_test.go:13)	TESTL	AX, AX
0x005b 00091 (defer1_test.go:13)	JNE	109
0x005d 00093 (defer1_test.go:16)	XCHGL	AX, AX
0x005e 00094 (defer1_test.go:16)	CALL	runtime.deferreturn(SB)
0x0063 00099 (defer1_test.go:16)	MOVQ	72(SP), BP
0x0068 00104 (defer1_test.go:16)	ADDQ	$80, SP
0x006c 00108 (defer1_test.go:16)	RET
0x006d 00109 (defer1_test.go:13)	XCHGL	AX, AX
0x006e 00110 (defer1_test.go:13)	CALL	runtime.deferreturn(SB)
0x0073 00115 (defer1_test.go:13)	MOVQ	72(SP), BP
0x0078 00120 (defer1_test.go:13)	ADDQ	$80, SP
0x007c 00124 (defer1_test.go:13)	RET
```

- 在defer出现的地方，插入了指令`CALL	runtime.deferprocStack(SB)`；
- 在函数返回之前的地方，插入指令`CALL	runtime.deferreturn(SB)`



```go
//普通的函数返回
add xx SP
return

//带defer语句的返回
call runtime.deferreturn，
add xx SP
return
```

## 5. 参考
- [defer关键字 · 深入解析Go](https://tiancaiamao.gitbooks.io/go-internals/content/zh/03.4.html)
- [Golang之轻松化解defer的温柔陷阱 \- 掘金](https://juejin.im/post/6844903775761596429#heading-0)