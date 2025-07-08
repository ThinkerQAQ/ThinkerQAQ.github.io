
## 1. 是什么
一种控制并发的方式
让一个goroutine等待其他goroutine完成
类似于[9.CountDownLatch.md](../Java/JUC/9.CountDownLatch/9.CountDownLatch.md)

## 2. 使用

```go
func main() {
	var wg sync.WaitGroup

	wg.Add(2)
	go func() {
		time.Sleep(2*time.Second)
		fmt.Println("1号完成")
		wg.Done()
	}()
	go func() {
		time.Sleep(2*time.Second)
		fmt.Println("2号完成")
		wg.Done()
	}()
	wg.Wait()
	fmt.Println("好了，大家都干完了，放工")
}
```


## 3. 原理
- 里面维护了一个counter计数器
- `Add`增加计数器
- `Done`计数器-1
- `Wait`等待计数器到达0时往下执行

## 4. 参考
- [Go语言实战笔记（二十）\| Go Context \| 飞雪无情的博客](https://www.flysnow.org/2017/05/12/go-in-action-go-context.html)