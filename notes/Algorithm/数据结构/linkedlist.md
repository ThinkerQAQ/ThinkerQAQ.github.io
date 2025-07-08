## 1. 是什么
## 2. 数组 vs 链表
数组按照索引查找快，链表插入删除快
## 3. 单向链表
### 3.1. 数据结构
- 头节点
- 长度
### 3.2. API
```go
type IList interface {
	//打印所有元素
	String() string
	//已使用的长度
	Length() int
	//是否为空
	IsEmpty() bool
	//index为0的位置添加一个元素，其他后移
	AddFirst(e model.Comparable) error
	//index的位置添加一个元素，其他后移
	Add(index int, e model.Comparable) error
	//index为length-1的位置添加一个元素，其他后移
	AddLast(e model.Comparable) error
	//获取index位置的元素
	Get(index int) (model.Comparable, error)
	//获取第一个元素
	GetFirst() (model.Comparable, error)
	//获取最后一个元素
	GetLast() (model.Comparable, error)
	//更新index位置的元素为e
	Set(index int, e model.Comparable) error
	//是否包含e
	Contains(e model.Comparable) bool
	//找到e，返回下标
	Find(e model.Comparable) int
	//删除e，返回下标
	RemoveElement(e model.Comparable) bool
	//index的位置删除一个元素，其他前移
	Remove(index int) (model.Comparable, error)
	//index为0的位置删除一个元素，其他前移
	RemoveFirst() (model.Comparable, error)
	//index为length-1的位置删除一个元素，其他前移
	RemoveLast() (model.Comparable, error)
}
```


### 3.3. 实现

```go

const NonExists = -1

type LinkedListNode struct {
	e    model.Comparable
	next *LinkedListNode
}

func NewLinkedListNode(e model.Comparable, next *LinkedListNode) *LinkedListNode {
	return &LinkedListNode{e: e, next: next}
}
func (l *LinkedListNode) String() string {
	return fmt.Sprintf("%v", l.e)
}

type LinkedList struct {
	dummyHead *LinkedListNode
	length    int
}

func NewLinkedList() *LinkedList {
	return &LinkedList{
		dummyHead: NewLinkedListNode(nil, nil),
		length:    0,
	}
}

func (l *LinkedList) String() string {
	str := fmt.Sprintf("length=%v, data=[", l.Length())
	node := l.dummyHead.next
	for i := 0; i < l.Length(); i++ {
		str += fmt.Sprintf("%v->", node)
		node = node.next
	}
	str = strings.TrimRight(str, "->")
	str += "]"
	return str
}

func (l *LinkedList) Length() int {
	return l.length
}

func (l *LinkedList) IsEmpty() bool {
	return l.Length() == 0
}

// O(1)
func (l *LinkedList) AddFirst(e model.Comparable) error {
	return l.Add(0, e)
}

// O(N)
func (l *LinkedList) Add(index int, e model.Comparable) error {
	if index < 0 || index > l.Length() {
		return fmt.Errorf("out of bound")
	}

	node := l.dummyHead
	for i := 0; i < index; i++ {
		node = node.next
	}

	node.next = NewLinkedListNode(e, node.next)
	l.length++
	return nil
}

// O(1)
func (l *LinkedList) AddLast(e model.Comparable) error {
	return l.Add(l.Length(), e)
}

// O(N)
func (l *LinkedList) Get(index int) (model.Comparable, error) {
	if index < 0 || index > l.Length()-1 {
		return nil, fmt.Errorf("out of bound")
	}

	node := l.dummyHead.next
	for i := 0; i < index; i++ {
		node = node.next
	}
	return node.e, nil
}

// O(1)
func (l *LinkedList) GetFirst() (model.Comparable, error) {
	return l.Get(0)
}

// O(N)
func (l *LinkedList) GetLast() (model.Comparable, error) {
	return l.Get(l.Length() - 1)
}

// O(N)
func (l *LinkedList) Set(index int, e model.Comparable) error {
	if index < 0 || index > l.Length()-1 {
		return fmt.Errorf("out of bound")
	}

	node := l.dummyHead.next
	for i := 0; i < index; i++ {
		node = node.next
	}
	node.e = e
	return nil
}

// O(N)
func (l *LinkedList) Contains(e model.Comparable) bool {
	index := l.Find(e)
	if index == NonExists {
		return false
	}
	return true
}

// O(N)
func (l *LinkedList) Find(e model.Comparable) int {
	node := l.dummyHead.next
	for i := 0; i < l.Length(); i++ {
		if node.e.CompareTo(e) == 0 {
			return i
		}
		node = node.next
	}

	return NonExists
}

// O(N)
func (l *LinkedList) RemoveElement(e model.Comparable) bool {
	index := l.Find(e)
	if index == NonExists {
		return false
	}
	_, _ = l.Remove(index)
	return true
}

// O(N)
func (l *LinkedList) Remove(index int) (model.Comparable, error) {
	if index < 0 || index > l.Length()-1 {
		return nil, fmt.Errorf("out of bound")
	}

	prev := l.dummyHead
	removed := l.dummyHead.next
	for i := 0; i < index; i++ {
		prev = prev.next
		removed = removed.next
	}

	prev.next = removed.next
	removed.next = nil
	l.length--
	return removed.e, nil
}

// O(1)
func (l *LinkedList) RemoveFirst() (model.Comparable, error) {
	return l.Remove(0)
}

// O(N)
func (l *LinkedList) RemoveLast() (model.Comparable, error) {
	return l.Remove(l.Length() - 1)
}
```

#### 3.3.1. 测试
```go
func TestLinkedList(t *testing.T) {
	list := NewLinkedList()
	fmt.Println(list)

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e0 := model.NewElement(0)
	list.AddLast(e1)
	list.AddLast(e2)
	list.AddFirst(e0)
	fmt.Println(list)

	list.RemoveFirst()
	list.RemoveLast()
	fmt.Println(list)

	fmt.Println(list.Contains(e1))
	fmt.Println(list.Find(e1))
	fmt.Println(list.RemoveElement(e1))
	fmt.Println(list)
	fmt.Println(list.IsEmpty())
}

```
## 4. 双向链表
### 4.1. 数据结构
- 头节点
- 尾节点
- 长度
### 4.2. API
- 同单向链表
### 4.3. 实现

```go
package list

import (
	"fmt"
	"my_algorithm/model"
	"strings"
)

type DoubleLinkedListNode struct {
	e    model.Comparable
	prev *DoubleLinkedListNode
	next *DoubleLinkedListNode
}

func NewDoubleLinkedListNode(e model.Comparable, prev *DoubleLinkedListNode, next *DoubleLinkedListNode) *DoubleLinkedListNode {
	return &DoubleLinkedListNode{e: e, prev: prev, next: next}
}
func (l *DoubleLinkedListNode) String() string {
	return fmt.Sprintf("%v", l.e)
}

type DoubleLinkedList struct {
	head   *DoubleLinkedListNode
	tail   *DoubleLinkedListNode
	length int
}

func NewDoubleLinkedList() *DoubleLinkedList {
	return &DoubleLinkedList{
		head:   nil,
		tail:   nil,
		length: 0,
	}
}

func (l *DoubleLinkedList) String() string {
	str := fmt.Sprintf("length=%v, head to tail=[", l.Length())
	node := l.head
	for i := 0; i < l.Length(); i++ {
		str += fmt.Sprintf("%v->", node)
		node = node.next
	}
	str = strings.TrimRight(str, "->")
	str += "]"

	str2 := "]"
	node = l.tail
	for i := 0; i < l.Length(); i++ {
		str2 = fmt.Sprintf("<-%v", node) + str2
		node = node.prev
	}
	str2 = strings.TrimLeft(str2, "<-")
	str2 = fmt.Sprintf(", tail to head=[%v", str2)
	return str + str2
}

func (l *DoubleLinkedList) Length() int {
	return l.length
}

func (l *DoubleLinkedList) IsEmpty() bool {
	return l.Length() == 0
}

// O(1)
func (l *DoubleLinkedList) AddFirst(e model.Comparable) error {
	newNode := NewDoubleLinkedListNode(e, nil, l.head)
	//一个节点都没有
	if l.head == nil {
		l.head = newNode
		l.tail = l.head
	} else {
		l.head.prev = newNode
		l.head = newNode
	}

	l.length++
	return nil
}

// O(N)
func (l *DoubleLinkedList) Add(index int, e model.Comparable) error {
	if index < 0 || index > l.Length() {
		return fmt.Errorf("out of bound")
	}

	if index == 0 {
		return l.AddFirst(e)
	} else if index == l.Length() {
		return l.AddLast(e)
	} else {
		prev := l.head
		for i := 0; i < index-1; i++ {
			prev = prev.next
		}
		newNode := NewDoubleLinkedListNode(e, prev, prev.next)
		prev.next.prev = newNode
		prev.next = newNode

		l.length++
		return nil
	}

}

// O(1)
func (l *DoubleLinkedList) AddLast(e model.Comparable) error {
	newNode := NewDoubleLinkedListNode(e, l.tail, nil)
	//一个节点都没有
	if l.tail == nil {
		l.tail = newNode
		l.head = l.tail
	} else {
		l.tail.next = newNode
		l.tail = newNode
	}

	l.length++
	return nil
}

// O(N)
func (l *DoubleLinkedList) Get(index int) (model.Comparable, error) {
	if index < 0 || index > l.Length()-1 {
		return nil, fmt.Errorf("out of bound")
	}

	node := l.head
	for i := 0; i < index; i++ {
		node = node.next
	}
	return node.e, nil
}

// O(1)
func (l *DoubleLinkedList) GetFirst() (model.Comparable, error) {
	return l.Get(0)
}

// O(1)
func (l *DoubleLinkedList) GetLast() (model.Comparable, error) {
	return l.Get(l.Length() - 1)
}

// O(N)
func (l *DoubleLinkedList) Set(index int, e model.Comparable) error {
	if index < 0 || index > l.Length()-1 {
		return fmt.Errorf("out of bound")
	}

	node := l.head
	for i := 0; i < index; i++ {
		node = node.next
	}
	node.e = e
	return nil
}

// O(N)
func (l *DoubleLinkedList) Contains(e model.Comparable) bool {
	index := l.Find(e)
	if index == NonExists {
		return false
	}
	return true
}

// O(N)
func (l *DoubleLinkedList) Find(e model.Comparable) int {
	node := l.head
	for i := 0; i < l.Length(); i++ {
		if node.e.CompareTo(e) == 0 {
			return i
		}
		node = node.next
	}

	return NonExists
}

// O(N)
func (l *DoubleLinkedList) RemoveElement(e model.Comparable) bool {
	index := l.Find(e)
	if index == NonExists {
		return false
	}
	_, _ = l.Remove(index)
	return true
}

// O(N)
func (l *DoubleLinkedList) Remove(index int) (model.Comparable, error) {
	if index < 0 || index > l.Length()-1 {
		return nil, fmt.Errorf("out of bound")
	}

	if index == 0 {
		return l.RemoveFirst()
	} else if index == l.Length()-1 {
		return l.RemoveLast()
	} else {
		prev := l.head
		for i := 0; i < index-1; i++ {
			prev = prev.next
		}

		removed := prev.next
		prev.next = removed.next
		removed.next.prev = prev

		removed.next = nil
		removed.prev = nil

		l.length--
		return removed.e, nil
	}

}

// O(1)
func (l *DoubleLinkedList) RemoveFirst() (model.Comparable, error) {
	if l.head == nil {
		return nil, fmt.Errorf("out of bound")
	}

	removed := l.head
	//只有一个节点
	if l.head == l.tail {
		l.head = nil
		l.tail = nil
	} else {
		l.head = l.head.next
		l.head.prev = nil
	}

	l.length--
	return removed.e, nil
}

// O(1)
func (l *DoubleLinkedList) RemoveLast() (model.Comparable, error) {
	if l.tail == nil {
		return nil, fmt.Errorf("out of bound")
	}

	removed := l.tail
	//只有一个节点
	if l.head == l.tail {
		l.head = nil
		l.tail = nil
	} else {
		l.tail = l.tail.prev
		l.tail.next = nil
	}

	l.length--
	return removed.e, nil
}

```

#### 4.3.1. 测试
```go
func TestDoubleLinkedList(t *testing.T) {
	list := NewDoubleLinkedList()
	fmt.Println(list)

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e0 := model.NewElement(0)
	list.AddLast(e1)
	list.AddLast(e2)
	list.AddFirst(e0)
	fmt.Println(list)

	list.RemoveFirst()
	list.RemoveLast()
	fmt.Println(list)

	fmt.Println(list.Contains(e1))
	fmt.Println(list.Find(e1))
	fmt.Println(list.RemoveElement(e1))
	fmt.Println(list)
	fmt.Println(list.IsEmpty())

	fmt.Println("===============")
	list.AddFirst(e0)
	list.AddLast(e2)
	list.Add(1, e1)
	list.Add(1, e2)
	list.Add(1, e1)
	fmt.Println(list)

	list.Remove(1)
	fmt.Println(list)
	list.Remove(1)
	fmt.Println(list)
	fmt.Println("****************")

	list.Add(list.Length()-1, e1)
	fmt.Println(list)
	list.Add(list.Length(), e0)
	fmt.Println(list)

}


```

## 5. 双向循环链表

### 5.1. 数据结构
- 头节点
- 尾节点
- 长度
### 5.2. API
- 同单向链表
### 5.3. 实现


```go
package list

import (
	"fmt"
	"my_algorithm/model"
	"strings"
)

type CircleDoubleLinkedListNode struct {
	e    model.Comparable
	prev *CircleDoubleLinkedListNode
	next *CircleDoubleLinkedListNode
}

func NewCircleDoubleLinkedListNode(e model.Comparable, prev *CircleDoubleLinkedListNode, next *CircleDoubleLinkedListNode) *CircleDoubleLinkedListNode {
	return &CircleDoubleLinkedListNode{e: e, prev: prev, next: next}
}
func (l *CircleDoubleLinkedListNode) String() string {
	return fmt.Sprintf("%v", l.e)
}

type CircleDoubleLinkedList struct {
	head   *CircleDoubleLinkedListNode
	tail   *CircleDoubleLinkedListNode
	length int
}

func NewCircleDoubleLinkedList() *CircleDoubleLinkedList {
	return &CircleDoubleLinkedList{
		head:   nil,
		tail:   nil,
		length: 0,
	}
}

func (l *CircleDoubleLinkedList) String() string {
	str := fmt.Sprintf("length=%v, head to tail=[", l.Length())
	node := l.head
	for i := 0; i < l.Length(); i++ {
		str += fmt.Sprintf("%v->", node)
		node = node.next
	}
	str = strings.TrimRight(str, "->")
	str += "]"

	str2 := "]"
	node = l.tail
	for i := 0; i < l.Length(); i++ {
		str2 = fmt.Sprintf("<-%v", node) + str2
		node = node.prev
	}
	str2 = strings.TrimLeft(str2, "<-")
	str2 = fmt.Sprintf(", tail to head=[%v", str2)
	return str + str2
}

func (l *CircleDoubleLinkedList) Length() int {
	return l.length
}

func (l *CircleDoubleLinkedList) IsEmpty() bool {
	return l.Length() == 0
}

// O(1)
func (l *CircleDoubleLinkedList) AddFirst(e model.Comparable) error {
	//一个节点都没有
	newNode := NewCircleDoubleLinkedListNode(e, l.tail, l.head)
	if l.head == nil {
		newNode.next = newNode
		newNode.prev = newNode
		l.head = newNode
		l.tail = l.head
	} else {
		l.tail.next = newNode
		l.head.prev = newNode
		l.head = newNode
	}

	l.length++
	return nil
}

// O(N)
func (l *CircleDoubleLinkedList) Add(index int, e model.Comparable) error {
	if index < 0 || index > l.Length() {
		return fmt.Errorf("out of bound")
	}

	if index == 0 {
		return l.AddFirst(e)
	} else if index == l.Length() {
		return l.AddLast(e)
	} else {
		prev := l.head
		for i := 0; i < index-1; i++ {
			prev = prev.next
		}
		newNode := NewCircleDoubleLinkedListNode(e, prev, prev.next)
		prev.next.prev = newNode
		prev.next = newNode

		l.length++
		return nil
	}

}

// O(1)
func (l *CircleDoubleLinkedList) AddLast(e model.Comparable) error {
	//一个节点都没有
	newNode := NewCircleDoubleLinkedListNode(e, l.tail, l.head)
	if l.tail == nil {
		newNode.next = newNode
		newNode.prev = newNode
		l.head = newNode
		l.tail = l.head
	} else {
		l.tail.next = newNode
		l.head.prev = newNode
		l.tail = newNode
	}

	l.length++
	return nil
}

// O(N)
func (l *CircleDoubleLinkedList) Get(index int) (model.Comparable, error) {
	if index < 0 || index > l.Length()-1 {
		return nil, fmt.Errorf("out of bound")
	}

	node := l.head
	for i := 0; i < index; i++ {
		node = node.next
	}
	return node.e, nil
}

// O(1)
func (l *CircleDoubleLinkedList) GetFirst() (model.Comparable, error) {
	return l.Get(0)
}

// O(1)
func (l *CircleDoubleLinkedList) GetLast() (model.Comparable, error) {
	return l.Get(l.Length() - 1)
}

// O(N)
func (l *CircleDoubleLinkedList) Set(index int, e model.Comparable) error {
	if index < 0 || index > l.Length()-1 {
		return fmt.Errorf("out of bound")
	}

	node := l.head
	for i := 0; i < index; i++ {
		node = node.next
	}
	node.e = e
	return nil
}

// O(N)
func (l *CircleDoubleLinkedList) Contains(e model.Comparable) bool {
	index := l.Find(e)
	if index == NonExists {
		return false
	}
	return true
}

// O(N)
func (l *CircleDoubleLinkedList) Find(e model.Comparable) int {
	node := l.head
	for i := 0; i < l.Length(); i++ {
		if node.e.CompareTo(e) == 0 {
			return i
		}
		node = node.next
	}

	return NonExists
}

// O(N)
func (l *CircleDoubleLinkedList) RemoveElement(e model.Comparable) bool {
	index := l.Find(e)
	if index == NonExists {
		return false
	}
	_, _ = l.Remove(index)
	return true
}

// O(N)
func (l *CircleDoubleLinkedList) Remove(index int) (model.Comparable, error) {
	if index < 0 || index > l.Length()-1 {
		return nil, fmt.Errorf("out of bound")
	}

	if index == 0 {
		return l.RemoveFirst()
	} else if index == l.Length()-1 {
		return l.RemoveLast()
	} else {
		prev := l.head
		for i := 0; i < index-1; i++ {
			prev = prev.next
		}

		removed := prev.next
		prev.next = removed.next
		removed.next.prev = prev

		removed.next = nil
		removed.prev = nil

		l.length--
		return removed.e, nil
	}

}

// O(1)
func (l *CircleDoubleLinkedList) RemoveFirst() (model.Comparable, error) {
	if l.head == nil {
		return nil, fmt.Errorf("out of bound")
	}

	removed := l.head
	//只有一个节点
	if l.head == l.tail {
		l.head = nil
		l.tail = nil
	} else {
		l.head = l.head.next
		l.head.prev = l.tail
		l.tail.next = l.head
	}

	l.length--
	return removed.e, nil
}

// O(1)
func (l *CircleDoubleLinkedList) RemoveLast() (model.Comparable, error) {
	if l.tail == nil {
		return nil, fmt.Errorf("out of bound")
	}

	removed := l.tail
	//只有一个节点
	if l.head == l.tail {
		l.head = nil
		l.tail = nil
	} else {
		l.tail = l.tail.prev
		l.tail.next = l.head
		l.head.prev = l.tail
	}

	l.length--
	return removed.e, nil
}

```

#### 5.3.1. 测试

```go
func TestCircleDoubleLinkedList(t *testing.T) {
	list := NewCircleDoubleLinkedList()
	fmt.Println(list)

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e0 := model.NewElement(0)
	list.AddLast(e1)
	list.AddLast(e2)
	list.AddFirst(e0)
	fmt.Println(list)

	list.RemoveFirst()
	list.RemoveLast()
	fmt.Println(list)

	fmt.Println(list.Contains(e1))
	fmt.Println(list.Find(e1))
	fmt.Println(list.RemoveElement(e1))
	fmt.Println(list)
	fmt.Println(list.IsEmpty())

	fmt.Println("===============")
	list.AddFirst(e0)
	list.AddLast(e2)
	list.Add(1, e1)
	list.Add(1, e2)
	list.Add(1, e1)
	fmt.Println(list)

	list.Remove(1)
	fmt.Println(list)
	list.Remove(1)
	fmt.Println(list)
	fmt.Println("****************")

	list.Add(list.Length()-1, e1)
	fmt.Println(list)
	list.Add(list.Length(), e0)
	fmt.Println(list)

}

```

## 6. 刷题套路
### 6.1. 双指针
- 两个指针指向同一个节点，同向而行
- 一个块一个慢，距离隔开多少
- 两个指针移动速度

```go
fast := head
slow := head
// 判断fast 和 fast.Next都不为nil 避免空指针
for fast != nil && fast.Next != nil {

}

```
### 6.2. 递归


### 6.3. 删除或者插入
先考虑删除一般情况：即非头节点，再考虑删除头节点
或者用一个伪节点统一处理头节点和非头节点

