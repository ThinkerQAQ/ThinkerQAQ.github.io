## 1. 使用

步骤如下：  
1. 导入包：`import runtime/trace`
2. 开启分析：`trace.Start(file)` 停止分析：`trace.Stop()`
```go
package main

import (
	"fmt"
	"os"
	"runtime/trace"
)

func main() {
	file, err := os.Create("trace.out")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	err = trace.Start(file)
	if err != nil {
		panic(err)
	}

	fmt.Println("Hello World")

	trace.Stop()
}

```
3. 命令行分析
    - `go tool trace trace.out`
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1598788249_20200830195044418_26504.png)
## 2. 参考
[Go execution tracer \| Gopher Academy Blog](https://blog.gopheracademy.com/advent-2017/go-execution-tracer/)
[Go 执行追踪器（execution tracer） \- Go语言中文网 \- Golang中文社区](https://studygolang.com/articles/12639?utm_source=pocket_saves)
[An Introduction to go tool trace](https://about.sourcegraph.com/blog/go/an-introduction-to-go-tool-trace-rhys-hiltner)
[How to analyze the performance of your go application in production \| Developer's life](https://blog.bullgare.com/2019/04/how-to-analyze-the-performance-of-your-go-application-in-production/)
[Go code refactoring : the 23x performance hunt \| by Val Deleplace \| Medium](https://medium.com/@val_deleplace/go-code-refactoring-the-23x-performance-hunt-156746b522f7)