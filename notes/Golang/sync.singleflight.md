## 1. 使用

```go
package main

import (
	"context"
	"fmt"
	"time"

	"git.code.oa.com/trpc-go/trpc-go"
	"golang.org/x/sync/singleflight"
)

type data string

func main() {
	// 设置一秒后超时的context
	d := time.Now().Add(1 * time.Second)
	ctx, cancel := context.WithDeadline(trpc.BackgroundContext(), d)
	defer cancel()

	var ret singleflight.Result
	var g singleflight.Group
	key := "https://weibo.com/1227368500/H3GIgngon"

	for i := 0; i < 5; i++ {
		go func(j int) {
			ch := g.DoChan(key, func() (interface{}, error) {
				ret, err := find(ctx, key)
				return ret, err
			})

			select {
			case <-ctx.Done():
				// 1s后超时
				fmt.Println(ctx.Err())
			case ret = <-ch: // Received result from channel
				fmt.Printf(" val: %v, shared: %v\n", ret.Val, ret.Shared)
			}
		}(i)
	}
	fmt.Println("22222222222222222222222222")

	time.Sleep(time.Hour)
}

func find(ctx context.Context, query string) (data, error) {
	time.Sleep(time.Minute)
	return data(fmt.Sprintf("result for %q", query)), nil
}


```
## 2. 参考
- [sync\.singleflight 到底怎么用才对？](https://www.cyningsun.com/01-11-2021/golang-concurrency-singleflight.html)