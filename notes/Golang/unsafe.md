## 1. 指针类型
### 1.1. 是什么
变量的地址
### 1.2. 为什么需要指针类型
使用指针类型可以让callee修改caller传递的值

```go
func double(x int) {
	x += x
}

func main() {
	var a = 3
	double(a)
	fmt.Println(a) // 3
}


//修改
func double(x *int) {
	*x += *x
	x = nil
}

func main() {
	var a = 3
	double(&a)
	fmt.Println(a) // 6
	
	p := &a
	double(p)
	fmt.Println(a, p == nil) // 12 false
}
```
### 1.3. Golang的指针类型
Golang的指针类型是安全的

- 不能进行数学运算
- 不同类型的指针不能相互转换
- 不同类型的指针不能使用 == 或 != 比较
- 不同类型的指针变量不能相互赋值
## 2. unsafe
### 2.1. 是什么
不安全的指针类型


### 2.2. 使用
![](https://raw.githubusercontent.com/TDoct/images/master/1598085216_20200822162728725_14849.png)
安全的指针类型无法进行计算，可以先转换成unsafe.Pointer，再转换成uintptr进行计算
#### 2.2.1. 获取slice的长度

```go
func TestUnsafe1(t *testing.T) {
	s := make([]int, 9, 20)
	
    //Len: &s => pointer => uintptr => pointer => *int => int
	var Len = *(*int)(unsafe.Pointer(uintptr(unsafe.Pointer(&s)) + uintptr(8)))
	fmt.Println(Len, len(s))

    //Cap: &s => pointer => uintptr => pointer => *int => int
	var Cap = *(*int)(unsafe.Pointer(uintptr(unsafe.Pointer(&s)) + uintptr(16)))
	fmt.Println(Cap, cap(s))
}

//输出
9 9
20 20
```
#### 2.2.2. 获取map的长度

```go
func TestUnsafe2(t *testing.T) {
	mp := make(map[string]int)
	mp["qcrao"] = 100
	mp["stefno"] = 18

	//&mp => pointer => **int => int
	count := **(**int)(unsafe.Pointer(&mp))
	fmt.Println(count, len(mp)) 
}

// 输出
2 2
```


#### 2.2.3. string和[]byte转换
```go
func TestUnsafe3(t *testing.T) {
	bytes := []byte{104, 101, 108, 108, 111}

	p := unsafe.Pointer(&bytes) //强制转换成unsafe.Pointer，编译器不会报错
	str := *(*string)(p)        //然后强制转换成string类型的指针，再将这个指针的值当做string类型取出来
	fmt.Println(str)            //输出 "hello
}
```

### 2.3. 原理

- 数据结构

```go
type ArbitraryType int

type Pointer *ArbitraryType//类似于C语言的void*
```

- 方法
```go
//返回类型 x 所占据的字节数，但不包含 x 所指向的内容的大小
func Sizeof(x ArbitraryType) uintptr
//返回结构体成员在内存中的位置离结构体起始处的字节数，所传参数必须是结构体的成员
func Offsetof(x ArbitraryType) uintptr
//返回 m，m 是指当类型进行内存对齐时，它分配到的内存地址能整除 m
func Alignof(x ArbitraryType) uintptr
```

## 3. 参考
- [深度解密Go语言之unsafe \| qcrao](https://qcrao.com/2019/06/03/dive-into-go-unsafe/)