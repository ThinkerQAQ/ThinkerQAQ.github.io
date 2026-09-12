---
title: "1.8 unsafe"
description: "1. 指针类型 2. unsafe：为什么存在、哪些转换是合法的，以及为什么不能依赖 slice/map 的内部布局。现代 Go 优先使用 unsafe.Add、unsafe.Slice、unsafe.String、unsafe.StringData 等显式 API，而不是手工计算 runtime 数据结构偏移。"
sourcePath: "Golang/unsafe.md"
category: "go"
categoryLabel: "Go"
topic: "language"
topicLabel: "1.Language"
order: 8
tags: ["Golang"]
createdAt: "2020-08-22T07:03:20Z"
updatedAt: "2020-09-08T08:31:38Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 指针类型
### 1.1. 是什么
变量的地址。

### 1.2. 为什么需要指针类型
使用指针可以让 callee 修改 caller 持有的值，也可以避免复制较大的数据结构。

```go
func double(x int) {
	x += x
}

func main() {
	var a = 3
	double(a)
	fmt.Println(a) // 3
}

func doublePtr(x *int) {
	*x += *x
	x = nil
}

func main() {
	var a = 3
	doublePtr(&a)
	fmt.Println(a) // 6

	p := &a
	doublePtr(p)
	fmt.Println(a, p == nil) // 12 false
}
```

### 1.3. Go 指针的限制
普通 Go 指针比 C 指针受限得多：

- 不能直接做指针算术；
- 不允许任意类型之间的指针转换；
- 编译器和 GC 能跟踪普通 Go 指针的对象关系。

## 2. `unsafe`

### 2.1. 是什么

`unsafe` 提供绕过 Go 类型系统部分安全检查的能力。它不是“更底层的普通指针”，而是一个需要严格遵守规则的特殊接口。

使用 `unsafe` 的代码必须人工保证：

- 类型和内存布局假设成立；
- 指针生命周期有效；
- GC 在需要时仍然能够追踪对象；
- 代码不会依赖未承诺的 runtime 内部实现。

因此 `unsafe` 更适合非常明确的底层场景，而不是常规业务代码。

## 3. 指针算术

历史写法通常是：

```go
p := unsafe.Pointer(uintptr(unsafe.Pointer(base)) + offset)
```

这种写法非常容易违反 `unsafe.Pointer` 的合法转换规则。现代 Go 如果只是做同一对象内部的地址偏移，应优先使用：

```go
p := unsafe.Add(unsafe.Pointer(base), offset)
```

`uintptr` 是整数，不是 GC 可追踪的指针。不要把指针长期转换成 `uintptr` 保存起来，之后再恢复成指针。

## 4. 不要依赖 slice / map 的 runtime 内部布局

我原来的笔记里有两种写法：

```go
// 假设 slice header 中 len 位于固定偏移
*(*int)(unsafe.Pointer(uintptr(unsafe.Pointer(&s)) + uintptr(8)))
```

以及通过强转 `map` 指针读取内部 count。

这些例子只能作为“历史上可以观察 runtime 内部布局”的实验，**不能作为可移植代码使用**。

原因包括：

- 偏移依赖 CPU 架构和指针宽度；
- slice/map 的 runtime 表示不是给业务代码承诺的 ABI；
- map 内部实现已经多次演进，未来仍可能变化。

读取长度直接使用：

```go
len(s)
len(m)
```

如果确实需要观察 runtime 内部结构，应该把代码明确限制在某个 Go 版本和目标架构，并视为源码研究代码，而不是通用技巧。

## 5. slice 和 string 的底层数据

### 5.1. 构造 slice

Go 1.17 起提供 `unsafe.Slice`：

```go
func bytesAt(ptr *byte, n int) []byte {
	return unsafe.Slice(ptr, n)
}
```

### 5.2. 获取 slice 数据地址

Go 1.20 起可以使用：

```go
p := unsafe.SliceData(buf)
```

### 5.3. string 与底层字节

Go 1.20 起提供 `unsafe.String` 和 `unsafe.StringData`：

```go
func bytesToStringNoCopy(b []byte) string {
	if len(b) == 0 {
		return ""
	}
	return unsafe.String(unsafe.SliceData(b), len(b))
}
```

这种转换仍然是 `unsafe`：生成的 string 按语言语义是不可变的，所以底层 `b` 在 string 存活期间不能再被修改。

普通代码优先使用安全转换：

```go
s := string(b)
b := []byte(s)
```

只有在 profile 明确证明复制成本值得优化时，才考虑 zero-copy。

## 6. `Sizeof` / `Offsetof` / `Alignof`

```go
unsafe.Sizeof(x)
unsafe.Offsetof(x.Field)
unsafe.Alignof(x)
```

这三个 API 适合检查当前目标平台上的大小、字段偏移和对齐，但结果可能与目标架构相关。

## 7. 校验 unsafe 代码

调试底层指针代码时，可以开启更严格的 `checkptr` 检查：

```bash
go test -gcflags=all=-d=checkptr=2 ./...
```

它不能证明 unsafe 代码一定正确，但能抓出一部分非法指针操作。

## 8. 参考
- [Package unsafe](https://pkg.go.dev/unsafe)
- [Go Language Specification - Package unsafe](https://go.dev/ref/spec#Package_unsafe)
- [Go compiler README](https://go.dev/src/cmd/compile/README)
- [深度解密Go语言之unsafe | qcrao](https://qcrao.com/2019/06/03/dive-into-go-unsafe/)
