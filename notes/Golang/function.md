## 1. 是什么

- 函数是一等公民
- 有具名函数、匿名函数
- 把函数绑定在struct上就成了方法
## 2. 使用
### 2.1. 可变参数

```go
func Print(a ...interface{}) {
	fmt.Println(a...)
}

func TestFunction1(t *testing.T) {
	var a = []interface{}{123, "abc"}

	Print(a...) // 123 abc
	Print(a)    // [123 abc]
}
```

### 2.2. 多返回值

go语言的函数可以返回多个值

```go
func TestFunction2(t *testing.T) {
	fmt.Println(multiRes(0))
	fmt.Println(multiRes(1))

}

func multiRes(val int) (res int, err error) {
	if val == 0 {
		return val * 2, nil
	}

	//如果返回的参数命名了， 那么可以直接返回
	return
}

//输出
0 <nil>
2 <nil>
```



#### 2.2.1. 原理
- C语言的实现
在调用函数中分配返回值的空间，并将返回值的指针传给被调函数
```c
//调用函数
int ret1, ret2;
f(a, b, &ret1, &ret2)
//被调函数
void f(int arg1, int arg2, int *ret1, int *ret2
```

- Go语言的实现
入参之上的位置保留返回值的位置
```go
func f(arg1, arg2 int) (ret1, ret2 int)
```
汇编
```
为ret2保留空位
为ret1保留空位
参数2
参数1  <-SP 
```
### 2.3. 返回值可命名

```go
func TestFunction3(t *testing.T) {
	fmt.Println(namedRes(1))
}

func namedRes(i int) (res int, err error) {
	res = i * 2
	err = fmt.Errorf("error...")
	return
}
//输出
2 error...
```
### 2.4. 闭包
#### 2.4.1. 是什么
- 内部函数引用了外部函数的变量，外部函数返回之后内部函数仍然可以使用这个变量，这就叫做闭包
- **匿名函数**+**引用了外部作用域中的变量**=**闭包函数**

#### 2.4.2. 使用
##### 2.4.2.1. 闭包对外部变量的访问是传引用方式
```go
func TestFunction5(t *testing.T) {
	var i int = 10
	func() {
		i++
	}()

	fmt.Println(i)
}
//输出
11
```
##### 2.4.2.2. 闭包是延时计算

```go
func TestFunction6(t *testing.T) {
    for i := 0; i < 3; i++ {
        defer func(){ println(i) } ()
    }
}
// Output:
// 3
// 3
// 3
```

- 修改

```go
func TestFunction6(t *testing.T)  {
    for i := 0; i < 3; i++ {
        i := i // 定义一个循环体内局部变量i
        defer func(){ println(i) } ()
    }
}

//或者
func TestFunction6(t *testing.T)  {
    for i := 0; i < 3; i++ {
        // 通过函数传入i
        // defer 语句会马上对调用参数求值
        defer func(i int){ println(i) } (i)
    }
}
```

### 2.5. init函数

- init1.go

```go
//在init之前执行
var aa string = getAa()

func getAa() string {
	fmt.Println("aaaaaaaaaa")
	return "eeeeee"
}

func init() {
	fmt.Println("init")
}

```

- function1_test.go

```go
func TestFunction4(t *testing.T) {
	fmt.Println(aa)
}

//输出
aaaaaaaaaa
init
eeeeee
```

### 2.6. 方法

```go
type Student struct {
	Name string
}

func (s Student) learn() {
	fmt.Println(s.Name + " is learning")
}

func TestMethod(t *testing.T) {
	s := &Student{
		Name: "zsk",
	}
	s.learn()
}

//输出
zsk is learning
```
## 3. 函数栈
- go的栈是动态变化的，一开始只会分配4或8KB，最大可以到达GB级别。
- go1.4之前使用链表实现动态栈，之后使用数组实现动态栈


## 4. 常用的函数
### 4.1. print

```go
func testPrint() {
	fmt.Printf("Hello %d\n", 23)              //格式化输出用到
	fmt.Fprint(os.Stdout, "Hello ", 23, "\n") //修改文件描述符会用到
	fmt.Println("Hello", 23)                  //拼接字符串输出用到
	s := fmt.Sprint("Hello ", 23)             //String()用到
	fmt.Println(s)
}
```
### 4.2. len vs cap

```go
func Test1(t *testing.T) {
	strings := make([]string, 0, 10)
	fmt.Println(len(strings), cap(strings))

	strings = append(strings, "a")
	fmt.Println(len(strings), cap(strings))
}

//输出
0 10
1 10
```
## 5. 参考
- [go \- cap vs len of slice in golang \- Stack Overflow](https://stackoverflow.com/questions/41668053/cap-vs-len-of-slice-in-golang)
