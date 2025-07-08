## 1. 使用
- bench.go
    ```go
    func Fib(n int) int {
    	if n < 2 {
    		return n
    	}
    	return Fib(n-1) + Fib(n-2)
    }
    ```

- bench_test.go
    ```go
    import (
    	"testing"
    )

    func BenchmarkFib(b *testing.B) {
    	// run the Fib function b.N times
    	for n := 0; n < b.N; n++ {
    		Fib(10)
    	}
    }
    ```
- 测试：
    - `go test -bench=.`
        ```go
        $ go test -bench=.
        goos: windows
        goarch: amd64
        pkg: test/bench
        BenchmarkFib-6           3888090               307 ns/op
        PASS
        ok      test/bench      1.850s
        ```
    - 查看内存分配信息：`go test -bench=. -benchmem`
        ```
        $ go test -bench=. -benchmem
        goos: windows
        goarch: amd64
        pkg: test/bench
        BenchmarkFib-6           3897542               307 ns/op               0 B/op          0 allocs/op
        PASS
        ok      test/bench      1.858s
        ```
    - 生成CPU信息：`go test -bench=. -benchmem -cpuprofile prof.cpu`
        - `go tool pprof bench.test.exe prof.cpu`
    - 生成内存信息：`go test -bench=. -benchmem -pmemprofile prof.mem`
        - `go tool pprof bench.test.exe prof.mem`
    - 生成全部信息： `go test -bench=".*" -benchtime=1000x -cpuprofile cpu.profile -benchmem -memprofile=mem.profile -blockprofile=block.profile -trace trace.out -mutexprofile mutex.out`
## 2. 结果解读
[go 语言 基准测试 结果解读 \| 睡月花儿](https://www.gagahappy.com/golang-test-benchmark-result-introducing/)
## 3. 参考
[How to write benchmarks in Go \| Dave Cheney](https://dave.cheney.net/2013/06/30/how-to-write-benchmarks-in-go)
[Go十大常见错误第2篇：benchmark性能测试的坑 \- 掘金](https://juejin.cn/post/7110428881848369160)
[benchmark 基准测试 \| Go 语言高性能编程 \| 极客兔兔](https://geektutu.com/post/hpg-benchmark.html)
[benchmarking \- What does allocs/op and B/op mean in go benchmark? \- Stack Overflow](https://stackoverflow.com/questions/35588474/what-does-allocs-op-and-b-op-mean-in-go-benchmark)
[go 语言 基准测试 结果解读 \| 睡月花儿](https://www.gagahappy.com/golang-test-benchmark-result-introducing/)
[golang 性能优化分析：benchmark 结合 pprof \- 九卷 \- 博客园](https://www.cnblogs.com/jiujuan/p/14604609.html)