## 1. 是什么
- 条件变量。Locker和Cond的关系类似于Java中Lock和Condition的关系。
- 所有方法必须持有Lock才能调用
- `func NewCond(l Locker) *Cond`使用Lock创建一个Cond
- `func (c *Cond) Wait()`自动释放Lock，并暂停当前goroutine，阻塞直到被`Broadcast or Signal`唤醒。必须放在while中执行
- `func (c *Cond) Broadcast()`用于唤醒所有阻塞在Cond的goroutine
- `func (c *Cond) Signal()`用于唤醒任意一个阻塞在Cond的goroutine

## 2. 使用

```go
type BlockingQueue struct {
	lock     sync.Locker
	notFull  *sync.Cond
	notEmpty *sync.Cond
	capacity int
	items    []string
}

func (c *BlockingQueue) Add(data string) {
	c.lock.Lock()
	defer c.lock.Unlock()

	for len(c.items) == c.capacity {
		c.notFull.Wait()
	}

	c.items = append(c.items, data)
	c.notEmpty.Broadcast()
}

func (c *BlockingQueue) Remove() string {
	c.lock.Lock()
	defer c.lock.Unlock()

	for len(c.items) == 0 {
		c.notEmpty.Wait()
	}

	data := c.items[0]
	c.items = c.items[1:]
	c.notFull.Broadcast()
	return data
}
func TestConcurrentList(t *testing.T) {
	var mutex sync.Mutex
	list := &BlockingQueue{
		lock:     &mutex,
		notFull:  sync.NewCond(&mutex),
		notEmpty: sync.NewCond(&mutex),
		capacity: 10,
		items:    make([]string, 0),
	}

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		for i := 0; i < 1000; i++ {
			list.Add(strconv.Itoa(i))
		}
	}()

	go func() {
		defer wg.Done()
		for {
			data := list.Remove()
			fmt.Println(data)
			if data == "999" {
				break
			}
		}
	}()

	wg.Wait()
}

```