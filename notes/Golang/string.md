
## 1. 字符集
计算机只能存储字节（二进制），因此字符肯定也是用字节存储的
但是存储后怎么显示呢？需要建立字节和字符的映射，这就是字符集
比如
- ![](https://raw.githubusercontent.com/TDoct/images/master/1618843114_20210419150502542_19665.png)
### 1.1. Unicode字符集
- 由来
    最开始只有ASCII字符集，只支持英文；
    为了支持中文简体，推出GB2312；
    为了支持中文繁体，推出BIG5...
    太多了，没有统一，于是Unicode出来了
- 定长编码
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1618843130_20210419150610610_18.png)
- 变长编码
    - UTF-8字符集
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1618843132_20210419150709984_21457.png)
## 2. 是什么
- 采用Unicode编码的字符串
## 3. 使用

### 3.1. 基本使用

```go
func TestString1(t *testing.T) {
	s := "hello world"
	fmt.Println(s, len(s))

	s1 := s + "!"
	fmt.Println(s1, len(s1))

	s2 := s[:5]
	fmt.Println(s2, len(s2))

	for _, i := range s2 {
		fmt.Println(i, string(i))
	}

}

//输出
hello world 11
hello world! 12
hello 5
104 h
101 e
108 l
108 l
111 o
```

### 3.2. string和[]byte之间的转换

- string转[]byte

```go
func str2bytes(s string) []byte {
	p := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		p[i] = c
	}
	return p
}

func TestString2(t *testing.T) {
	fmt.Println(str2bytes("hello"))
}

//输出
[104 101 108 108 111]
```


- []byte转string

```go
func TestString3(t *testing.T) {
	fmt.Println(bytes2str([]byte{104, 101, 108, 108, 111}))
}

func bytes2str(s []byte) (p string) {
	data := make([]byte, len(s))
	for i, c := range s {
		data[i] = c
	}

	hdr := (*reflect.StringHeader)(unsafe.Pointer(&p))
	hdr.Data = uintptr(unsafe.Pointer(&data[0]))
	hdr.Len = len(s)

	return p
}
//输出
hello
```
## 4. 原理
### 4.1. 数据结构

```go
type StringHeader struct {
    Data uintptr//字符串指向的底层字节数组
    Len  int//字符串的字节的长度
}

```

#### 4.1.1. 如何确定字符结尾
- C语言采用的是`'\0'`确定字符边界，而Golang则是采用`长度`字段
#### 4.1.2. 底层是字节数组，不可变

```go
s := "test"
fmt.Println(s[1])
s[1] = 'c'//编译不能通过
```

![](https://raw.githubusercontent.com/TDoct/images/master/1596973801_20200809185319085_25236.png)

##### 4.1.2.1. 为什么不可变
```go
s := "test"
s1 := s[1:]
```
- 如果s1能改，那么会影响到s，这样可能会造成不可预估的后果
## 5. 参考
- [基本类型 · 《深入解析go》](https://docs.kilvn.com/go-internals/02.1.html)