---
title: "2.8 sync.Mutex"
description: "1. Mutex是什么 - 互斥锁 - 实现了Locker接口，zero-value是没加锁的状态 - 加锁解锁可以在不同的goroutine中 2. 使用 2.1. 不使用Mutex的情况 2.2. 使用Mutex的情况"
sourcePath: "Golang/sync.Mutex.md"
category: "go"
categoryLabel: "Go"
topic: "concurrency"
topicLabel: "2.Concurrency"
order: 21
tags: ["Golang"]
createdAt: "2020-09-06T09:29:50Z"
updatedAt: "2020-09-06T09:34:01Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Mutex是什么
- 互斥锁
- 实现了Locker接口，zero-value是没加锁的状态
- 加锁解锁可以在不同的goroutine中

## 2. 使用

### 2.1. 不使用Mutex的情况
```go
const TIMES = 1000

var data int = 0

func TestSync2(t *testing.T) {
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		for i := 0; i < TIMES; i++ {
			data--
			time.Sleep(2*time.Millisecond)
		}
	}()

	go func() {
		defer wg.Done()
		for i := 0; i < TIMES; i++ {
			data++
			time.Sleep(time.Millisecond)
		}
	}()

	wg.Wait()
	fmt.Println(data, data == 0)
}
//输出
-1 false
```

### 2.2. 使用Mutex的情况

```go
const TIMES = 1000

var data int = 0

func TestSync2(t *testing.T) {
	var wg sync.WaitGroup
	var lock sync.Mutex
	wg.Add(2)
	go func() {
		defer wg.Done()
		for i := 0; i < TIMES; i++ {
			lock.Lock()
			data--
			lock.Unlock()
			time.Sleep(2 * time.Millisecond)
		}
	}()

	go func() {
		defer wg.Done()
		for i := 0; i < TIMES; i++ {
			lock.Lock()
			data++
			lock.Unlock()
			time.Sleep(time.Millisecond)
		}
	}()

	wg.Wait()
	fmt.Println(data, data == 0)
}


//输出
0 true
```