## 1. Golang的特点
- 编译型，因此不需要虚拟机
- 静态类型
- 有GC，内存管理全自动
### 1.1. Golang vs Java
|         |                Go                 |             Java              |
| ------- | --------------------------------- | ----------------------------- |
| 虚拟机   | 无                                | 有                            |
| 跨平台   | 支持，依赖编译器在不同平台编译       | 支持，依赖JVM一次编译，到处执行 |
| 类型     | 编译型                             | 解释型                        |
| 内存管理 | GC，自动                           | GC，自动                      |
| 编程范式 | 面向过程、面向对象、函数式、面向消息 | 面向对象                      |
| 生态     | 不完善。需要自己组合 | 完善。基于Spring业务开发                        |
Go的内存管理类似于操作系统的虚拟地址空间，把内存分为等块大小
## 2. 环境搭建
[Go环境搭建.md](Go环境搭建.md)
## 3. 关键字
### 3.1. for

#### 3.1.1. for循环的不同形式

##### 3.1.1.1. 经典for循环

```go
func TestFor1(t *testing.T) {
	//for (init;before;after)
	sum := 0
	for i := 0; i < 10; i++ {
		sum += i
	}
	fmt.Println(sum)
}

//输出
45
```


##### 3.1.1.2. while循环

```go
func TestFor2(t *testing.T) {
	//while(xxx)
	x := 0
	for x < 10 {
		fmt.Println(x)
		x = x + 1
	}
}

//输出
0
1
2
3
4
5
6
7
8
9
```

##### 3.1.1.3. 死循环

```go
func TestFor3(t *testing.T) {
	//for(;;)
	for {
		fmt.Println("test")
	}
}
```

##### 3.1.1.4. 增强for循环

```go

func TestFor4(t *testing.T) {
	//	遍历数组、切片、字符串或者映射，或从信道中读取消息
	oldMap := map[int]string{
		1: "a",
		2: "b",
	}

	newMap := make(map[int]string)
	for k, v := range oldMap {
		newMap[k] = v
	}

	fmt.Println(oldMap, newMap)
}
//输出
map[1:a 2:b] map[1:a 2:b]
```
###### 3.1.1.4.1. 并发问题
增强for循环遍历的是同一个地址，如果是并发中会有问题

```go
func TestFor5(t *testing.T) {
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
func TestFor6(t *testing.T) {
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
### 3.2. switch
- 不需要break

```go
func TestSwitch1(t *testing.T) {
	unhex('0')
}

func unhex(c byte) {
	switch {
	case c >= '0':
		fmt.Println("c>=0")
	case c == '0':
		fmt.Println("c==0")
	default:
		fmt.Println("c<0")
	}

}
//输出
c>=0
```

- 加了break也行

```go
func TestSwitch2(t *testing.T) {
	unhex2('0')
}

func unhex2(c byte) {
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

//输出
0
```
### 3.3. select
[select.md](select.md)
### 3.4. defer

[defer.md](defer.md)

### 3.5. panic和recover
[panic和recover.md](panic和recover.md)
### 3.6. make和new
[make vs new.md](make%20vs%20new.md)

## 4. 类型系统
[类型系统.md](类型系统.md)
## 5. 数据结构
### 5.1. string
[string.md](string.md)
### 5.2. array
[array.md](array.md)

### 5.3. slice
[slice.md](slice.md)

### 5.4. map
[map.md](map.md)
### 5.5. struct
[struct.md](struct.md)
## 6. 函数
[function.md](function.md)

## 7. 接口

[interface.md](interface.md)

## 8. 包
[package.md](package.md)
## 9. 依赖管理
[go.mod.md](go.mod.md)
## 10. 并发
[concurrent.md](concurrent.md)


## 11. 反射
[reflection.md](reflection.md)

## 12. 错误
[error.md](error.md)

## 13. 单元测试
[unittest.md](unittest.md)
## 14. benchmark
[benchmark.md](benchmark.md)

## 15. 调试
[dlv.md](dlv.md)
## 16. 内存管理

[内存管理.md](内存管理.md)
[内存对齐.md](内存对齐.md)
## 17. GC
[GC.md](GC.md)

## 18. 指针
[unsafe.md](unsafe.md)

## 19. 构建过程
[Go构建过程.md](Go构建过程.md)
[plan9汇编.md](plan9汇编.md)
## 20. 性能优化
[pprof.md](pprof.md)
[trace.md](trace.md)
## 21. core dump
[调试Go语言的核心转储（Core Dumps） \- SegmentFault 思否](https://segmentfault.com/a/1190000010684345?utm_source=pocket_mylist)
[golang coredump分析 \- 代码先锋网](https://www.codeleading.com/article/8553108298/)
## 22. 参考资料
- [Documentation \- The Go Programming Language](https://golang.org/doc/)
- [A Tour of Go](https://tour.golang.org/welcome/1)
- [Effective Go \- The Go Programming Language](https://golang.org/doc/effective_go.html)
- [The Go Programming Language Specification \- The Go Programming Language](https://golang.org/ref/spec#Introduction)
- [Packages \- The Go Programming Language](https://golang.org/pkg/)
- [如何研究Go内部实现 · 《深入解析go》](https://docs.kilvn.com/go-internals/01.0.html)
- [Go 语言设计与实现 \| Go 语言设计与实现](https://draveness.me/golang/)
- [Introduction · Go语言高级编程](https://chai2010.cn/advanced-go-programming-book/)
- [随笔列表第2页 \- 爱写程序的阿波张 \- 博客园](https://www.cnblogs.com/abozhang/default.html?page=2)
- [编程语言 \| qcrao](https://qcrao.com/categories/%E7%BC%96%E7%A8%8B%E8%AF%AD%E8%A8%80/)
- [a-journey-with-go](https://medium.com/a-journey-with-go)
- [https://mp\.weixin\.qq\.com/mp/homepage?\_\_biz=Mzg5NjIwNzIxNQ==&hid=3&sn=763be099a57984aae1baef3f45b38db7&scene=1&devicetype=Windows\+10\+x64&version=6302018f&lang=zh\_CN&nettype=cmnet&ascene=1&session\_us=gh\_b3e3966468b1&wx\_header=1&uin=&key=&fontgear=2](https://mp.weixin.qq.com/mp/homepage?__biz=Mzg5NjIwNzIxNQ==&hid=3&sn=763be099a57984aae1baef3f45b38db7&scene=1&devicetype=Windows+10+x64&version=6302018f&lang=zh_CN&nettype=cmnet&ascene=1&session_us=gh_b3e3966468b1&wx_header=1&uin=&key=&fontgear=2)
- [golang和java，谁才是最终答案？ \- 知乎](https://www.zhihu.com/question/426853388/answer/1604756202)