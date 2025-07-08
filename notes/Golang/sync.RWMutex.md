## 1. 是什么
- 实现了Locker接口，是个读写锁
- `Lock`，`RLock`分别用于加写锁和读锁
- `Unlock`，`RUnlock`分别用于解写锁和读锁
## 2. 使用

```go
const Size = 5

func TestSync3(t *testing.T) {
	data := make(map[int]int)
	var lock sync.RWMutex
	var wg sync.WaitGroup

	wg.Add(3)

	go func() {
		defer wg.Done()
		for i := 0; i < Size; i++ {
			lock.Lock()
			data[i] = i
			lock.Unlock()

			time.Sleep(time.Second)
		}
	}()

	for i := 0; i < 2; i++ {
		go func() {
			defer wg.Done()
			for {
				lock.RLock()
				fmt.Println(data)
				if len(data) == Size {
					lock.RUnlock()
					break
				} else {
					lock.RUnlock()
				}
			}
			time.Sleep(time.Millisecond * 500)
		}()

	}
	wg.Wait()

}
```