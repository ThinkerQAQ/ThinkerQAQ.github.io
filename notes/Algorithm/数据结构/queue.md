## 1. 是什么
- 先进先出
## 2. 普通队列
### 2.1. 数据结构
- 动态数组或链表
### 2.2. API

```go
type IQueue interface {
	//打印所有元素
	String() string
	//队列中元素个数
	Length() int
	//队列是否为空
	IsEmpty() bool
	//入队，O(1)
	Enqueue(e model.Comparable) error
	//出队，O(1)
	Dequeue() (model.Comparable, error)
	//获取队首，O(1)
	GetFront() (model.Comparable, error)
}

```


### 2.3. 实现

```go
type Queue struct {
	list list.IList
}

func (q *Queue) String() string {
	str := fmt.Sprintf("length=%v, data=[", q.Length())
	for i := 0; i < q.Length(); i++ {
		value, _ := q.list.Get(i)
		str += fmt.Sprintf("%v ", value)
	}
	str = strings.TrimRight(str, " ")
	str += "]"
	return str
}

func NewQueue() *Queue {
	return &Queue{list: list.NewDoubleLinkedList()}
}

func (q *Queue) Length() int {
	return q.list.Length()
}

func (q *Queue) IsEmpty() bool {
	return q.list.IsEmpty()
}

func (q *Queue) Enqueue(e model.Comparable) error {
	return q.list.AddLast(e)
}

func (q *Queue) Dequeue() (model.Comparable, error) {
	return q.list.RemoveFirst()
}

func (q *Queue) GetFront() (model.Comparable, error) {
	return q.list.GetFirst()
}


```

#### 2.3.1. 测试
```go
func TestQueue(t *testing.T) {
	queue := NewQueue()
	fmt.Println(queue)

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e3 := model.NewElement(3)
	queue.Enqueue(e1)
	queue.Enqueue(e2)
	queue.Enqueue(e3)
	fmt.Println(queue)

	fmt.Println(queue.Dequeue())
	fmt.Println(queue.Dequeue())

	fmt.Println(queue.GetFront())
	fmt.Println(queue)
}

```
## 3. 循环队列
### 3.1. 数据结构
- 存放数据的数组
- 已使用的长度
- 总长度
- 头节点下标位置
- 尾节点下标位置
### 3.2. API
- 同队列
### 3.3. 实现

```go

type LoopQueue struct {
	array []model.Comparable

	//队首
	front int
	//队尾，下一个元素添加的位置
	tail     int
	length   int
	capacity int
}

func NewLoopQueue() *LoopQueue {
	return &LoopQueue{
		array:    make([]model.Comparable, 1),
		front:    0,
		tail:     0,
		length:   0,
		capacity: 1,
	}
}

func (l *LoopQueue) String() string {
	s := fmt.Sprintf("length=%v, capacity=%v, data={", l.Length(), l.capacity)
	for i := l.front; i < l.tail; i = (i + 1) % l.capacity {
		s += fmt.Sprintf("%v ", l.array[i])
	}
	s = strings.TrimRight(s, " ")
	s += "}"
	return s
}

func (l *LoopQueue) Length() int {
	return l.length
}

func (l *LoopQueue) IsEmpty() bool {
	return l.front == l.tail
}

func (l *LoopQueue) isFull() bool {
	//浪费一个元素
	return (l.tail+1)%l.capacity == l.front
}

func (l *LoopQueue) Enqueue(e model.Comparable) error {
	if l.isFull() {
		l.resize(l.capacity * 2)
	}
	l.array[l.tail] = e
	l.tail = (l.tail + 1) % l.capacity
	l.length++
	return nil
}

func (l *LoopQueue) Dequeue() (model.Comparable, error) {
	if l.IsEmpty() {
		return nil, fmt.Errorf("queue is empty")
	}
	removed := l.array[l.front]
	l.front = (l.front + 1) % l.capacity
	l.length--
	if l.length == l.capacity/4 {
		l.resize(l.capacity / 2)
	}
	return removed, nil
}

func (l *LoopQueue) GetFront() (model.Comparable, error) {
	if l.IsEmpty() {
		return nil, fmt.Errorf("queue is empty")

	}
	return l.array[l.front], nil
}

func (l *LoopQueue) resize(newCapacity int) {
	newArray := make([]model.Comparable, newCapacity+1)
	for i := 0; i < l.length; i++ {
		newArray[i] = l.array[(i+l.front)%l.capacity]
	}
	l.array = newArray
	l.front = 0
	l.tail = l.length
	l.capacity = newCapacity + 1
}
```
#### 3.3.1. 测试
```go
func TestLoopQueue(t *testing.T) {
	queue := NewLoopQueue()
	fmt.Println("初始状态：", queue)

	e0 := model.NewElement(0)
	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	queue.Enqueue(e0)
	queue.Enqueue(e1)
	queue.Enqueue(e2)
	fmt.Println("添加元素后：", queue)

	fmt.Println(queue.Dequeue())
	fmt.Println(queue.Dequeue())
	fmt.Println(queue.GetFront())
	fmt.Println("删除元素后：", queue)

}
```

## 4. 优先级队列
### 4.1. 数据结构
- 最大堆
### 4.2. API
- 同队列
### 4.3. 实现

```go
type PriorityQueue struct {
	heap heap.IMaxHeap
}

func NewPriorityQueue() *PriorityQueue {
	return &PriorityQueue{heap: heap.NewMaxHeap()}
}

func (p *PriorityQueue) String() string {
	return p.heap.String()
}

func (p *PriorityQueue) Length() int {
	return p.heap.Length()
}

func (p *PriorityQueue) IsEmpty() bool {
	return p.heap.IsEmpty()
}

//O(logN)
func (p *PriorityQueue) Enqueue(e model.Comparable) error {
	return p.heap.Add(e)
}

//O(logN)
func (p *PriorityQueue) Dequeue() (model.Comparable, error) {
	return p.heap.ExtractMax()
}

//O(1)
func (p *PriorityQueue) GetFront() (model.Comparable, error) {
	return p.heap.FindMax()
}
```


## 5. 双端队列
### 5.1. 数据结构
- 双向链表
### 5.2. API

```go
type IDequeue interface {
	//打印所有元素
	String() string
	//队列中元素个数
	Length() int
	//队列是否为空
	IsEmpty() bool
	//从尾部入队，O(1)
	EnqueueEnd(e model.Comparable) error
	//从头部入队，O(1)
	EnqueueFront(e model.Comparable) error
	//从尾部出队，O(1)
	DequeueEnd() (model.Comparable, error)
	//从头部出队，O(1)
	DequeueFront() (model.Comparable, error)
	//获取队首，O(1)
	GetFront() (model.Comparable, error)
	//获取队尾，O(1)
	GetEnd() (model.Comparable, error)
}

```
### 5.3. 实现


```go

type Dequeue struct {
	list list.IList
}

func (q *Dequeue) String() string {
	str := fmt.Sprintf("length=%v, data=[", q.Length())
	for i := 0; i < q.Length(); i++ {
		value, _ := q.list.Get(i)
		str += fmt.Sprintf("%v ", value)
	}
	str = strings.TrimRight(str, " ")
	str += "]"
	return str
}

func NewDequeue() *Dequeue {
	return &Dequeue{list: list.NewDoubleLinkedList()}
}

func (q *Dequeue) Length() int {
	return q.list.Length()
}

func (q *Dequeue) IsEmpty() bool {
	return q.list.IsEmpty()
}

func (q *Dequeue) EnqueueEnd(e model.Comparable) error {
	return q.list.AddLast(e)
}

func (q *Dequeue) EnqueueFront(e model.Comparable) error {
	return q.list.AddFirst(e)
}

func (q *Dequeue) DequeueEnd() (model.Comparable, error) {
	return q.list.RemoveLast()
}

func (q *Dequeue) DequeueFront() (model.Comparable, error) {
	return q.list.RemoveFirst()
}

func (q *Dequeue) GetFront() (model.Comparable, error) {
	return q.list.GetFirst()
}

func (q *Dequeue) GetEnd() (model.Comparable, error) {
	return q.list.GetLast()
}

```
