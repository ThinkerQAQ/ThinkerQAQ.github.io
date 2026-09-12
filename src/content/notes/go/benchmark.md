---
title: "4.3 benchmark"
description: "Go benchmark 基础：使用 testing.B、b.Loop、-benchmem、CPU/内存 profile，并用 benchstat 做多次结果比较。保留 b.N 作为历史兼容写法。"
sourcePath: "Golang/benchmark.md"
category: "go"
categoryLabel: "Go"
topic: "performance"
topicLabel: "4.Performance"
order: 40
tags: ["Golang"]
createdAt: "2022-04-06T14:04:08Z"
updatedAt: "2022-11-19T12:06:16Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 使用

### 1.1. 被测代码

```go
func Fib(n int) int {
	if n < 2 {
		return n
	}
	return Fib(n-1) + Fib(n-2)
}
```

### 1.2. Benchmark

Go 1.24 起，新的 benchmark 推荐使用 `b.Loop()`：

```go
import "testing"

func BenchmarkFib(b *testing.B) {
	for b.Loop() {
		Fib(10)
	}
}
```

`b.Loop()` 的好处：

- setup 可以写在循环前，不计入 benchmark 主体时间；
- testing 包负责控制循环；
- 编译器会避免把 loop body 中需要测量的调用完全优化掉；
- benchmark 函数在一次测量中不需要像传统 `b.N` 风格那样反复执行 setup。

历史代码仍然可以使用：

```go
func BenchmarkFib(b *testing.B) {
	for n := 0; n < b.N; n++ {
		Fib(10)
	}
}
```

如果使用 `b.N` 风格并且 setup 成本较大，要注意 `b.ResetTimer()`。

## 2. 常用命令

### 2.1. 基准测试

```bash
go test -bench=.
```

典型结果：

```text
BenchmarkFib-8    4000000    300 ns/op
```

表示 benchmark body 平均每次执行大约 300ns。

### 2.2. 查看内存分配

```bash
go test -bench=. -benchmem
```

常见字段：

```text
ns/op
B/op
allocs/op
```

分别表示每次操作耗时、每次操作分配的字节数、每次操作发生的分配次数。

### 2.3. CPU profile

```bash
go test -bench=. -cpuprofile=cpu.profile
```

然后：

```bash
go tool pprof cpu.profile
```

### 2.4. 内存 profile

原笔记这里写成了 `-pmemprofile`，正确参数是：

```bash
go test -bench=. -memprofile=mem.profile
```

然后：

```bash
go tool pprof mem.profile
```

### 2.5. 其他 profile / trace

```bash
go test \
  -bench=. \
  -benchmem \
  -cpuprofile=cpu.profile \
  -memprofile=mem.profile \
  -blockprofile=block.profile \
  -mutexprofile=mutex.profile \
  -trace=trace.out
```

这些数据应按问题选择，不需要每次 benchmark 全部生成。

## 3. 不要只跑一次

benchmark 容易受到 CPU 调频、后台任务、缓存、调度等噪声影响。

如果要比较优化前后，更合理的是多跑几次：

```bash
go test -bench=. -count=10 > old.txt
# 修改代码
go test -bench=. -count=10 > new.txt
```

然后使用 `benchstat`：

```bash
benchstat old.txt new.txt
```

`benchstat` 比手工比较一次 `ns/op` 更适合判断变化是否稳定。

## 4. Benchmark 常见坑

### 4.1. 编译器优化

不要测一段最终完全没有可观察结果、可能被编译器消除的代码。

`b.Loop()` 已经针对 loop body 做了额外保护，但依然应该让 benchmark 模拟真实使用方式。

### 4.2. 把 setup 算进 benchmark

`b.Loop()` 会自动处理第一次进入循环前的 timer；传统 `b.N` 写法则需要根据情况调用：

```go
b.ResetTimer()
```

### 4.3. benchmark 与生产环境不同

benchmark 结果只是当前机器、当前 Go 版本、当前输入下的结果。

真正做性能优化时，应结合：

- benchmark；
- pprof；
- trace；
- 生产 workload。

## 5. 参考
- [Package testing - Benchmarks](https://pkg.go.dev/testing#hdr-Benchmarks)
- [testing.B.Loop](https://pkg.go.dev/testing#B.Loop)
- [golang.org/x/perf/cmd/benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat)
- [How to write benchmarks in Go | Dave Cheney](https://dave.cheney.net/2013/06/30/how-to-write-benchmarks-in-go)
- [benchmark 基准测试 | Go 语言高性能编程](https://geektutu.com/post/hpg-benchmark.html)
