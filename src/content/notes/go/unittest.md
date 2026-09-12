---
title: "4.1 unittest"
description: "1. 是什么 单元测试 2. 使用 - 文件名 xxx test.go - 导入 testing - 函数名必须 TestXXX - 运行 - go test . 3. 参考 - Go语言基础之单元测试 \\ 李文周的博客 - testing \\- The Go Programming Languag"
sourcePath: "Golang/unittest.md"
category: "go"
categoryLabel: "Go"
topic: "performance"
topicLabel: "4.Performance"
order: 38
tags: ["Golang"]
createdAt: "2020-05-24T12:18:39Z"
updatedAt: "2022-11-20T06:48:30Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 是什么
单元测试
## 2. 使用
- 文件名`xxx_test.go`
- 导入`testing`
- 函数名必须`TestXXX`

```go
package array1

import (
	"fmt"
	"reflect"
	"testing"
)

func TestArray1(t *testing.T) {
	slices := []string{"1", "2", "3"}
	fmt.Println(slices)
}
```

- 运行
    - `go test .`

## 3. 参考

- [Go语言基础之单元测试 \| 李文周的博客](https://www.liwenzhou.com/posts/Go/16_test/)
- [testing \- The Go Programming Language](https://golang.org/pkg/testing/)
- [Mock 测试 \- 掘金](https://juejin.im/post/59c3a3ba6fb9a00a496e6397)
- [How to mock? Go Way\. \- Learn Go Programming](https://blog.learngoprogramming.com/how-to-mock-in-your-go-golang-tests-b9eee7d7c266)