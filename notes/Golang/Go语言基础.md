## 1. 关键字
### 1.1. for

#### 1.1.1. for循环的不同形式

##### 1.1.1.1. 经典for循环

```go
//for (init;before;after)
sum := 0
for i := 0; i < 10; i++ {
	sum += i
}
```


##### 1.1.1.2. while循环

```go
//while(xxx)
x := 0
for x < 100 {
	fmt.Println(x)
	x = x + 1
}
```

##### 1.1.1.3. 死循环

```go
//for(;;)
for {
	fmt.Println("test")
}


```

##### 1.1.1.4. 增强for循环

```go

//	遍历数组、切片、字符串或者映射，或从信道中读取消息
oldMap := map[int]string{
	1: "a",
	2: "b",
}

newMap := make(map[int]string)
for k, v := range oldMap {
	newMap[k] = v
}
```

- 注意：增强for循环遍历的是同一个地址，如果是并发中会有问题

```go
func TestFor(t *testing.T) {
	arrays := []uint64{1,2,4}

	for _, val := range arrays {
		fmt.Println(&val, val)
	}

}

//输出

0xc00000a310 1
0xc00000a310 2
0xc00000a310 4
```

- 解决：使用局部变量


```go
func TestFor(t *testing.T) {
	arrays := []uint64{1,2,4}

	for _, val := range arrays {
		tmpVal := val
		fmt.Println(&tmpVal, tmpVal)
	}

}

//输出
0xc00000a310 1
0xc00000a320 2
0xc00000a330 4
```
### 1.2. switch

```go
func unhex(c byte) {
	//switch {
	//case c >= '0':
	//	fmt.Println("c>=0")
	//case c == '0':
	//	fmt.Println("c==0")
	//default:
	//	fmt.Println("c<0")
	//}

	switch c {
	case '0':
		fmt.Println("0")
	case '1', '2':
		fmt.Println("1")
		break //自己加break也ok，下面的qqqqq不会输出
		fmt.Println("qqqqqqqqqqqqqq")
	default:
		fmt.Println("others")
	}

}
```
### 1.3. defer

[defer.md](defer.md)


### 1.4. make new
[make vs new.md](make%20vs%20new.md)


## 2. 数据结构
### 2.1. string
[string.md](string.md)
### 2.2. 数组
[数组.md](数组.md)

### 2.3. slice
[slice.md](slice.md)

### 2.4. map
[map.md](map.md)

## 3. 函数
[function.md](function.md)

## 4. 接口

[interface.md](interface.md)

## 5. 包
[package.md](package.md)

## 6. 并发
[并发.md](并发.md)
## 7. 反射
[reflection.md](reflection.md)

## 8. 错误
[错误处理.md](错误处理.md)

## 9. 文件
[文件.md](文件.md)

## 10. 源码
[如何研究Go内部实现 · 《深入解析go》](https://docs.kilvn.com/go-internals/01.0.html)
[Go 语言设计与实现 \| Go 语言设计与实现](https://draveness.me/golang/)
[Introduction · Go语言高级编程](https://chai2010.cn/advanced-go-programming-book/)