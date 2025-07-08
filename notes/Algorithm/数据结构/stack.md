## 1. 是什么
- 后进先出
### 1.1. 数据结构
- 动态数组或链表
### 1.2. API

```go
type IStack interface {
	//打印所有元素
	String() string
	//获取元素长度
	Length() int
	//是否为空
	IsEmpty() bool
	//往栈顶压入一个元素，O(1)
	Push(e model.Comparable) error
	//从栈顶弹出一个元素，O(1)
	Pop() (model.Comparable, error)
	//查询栈顶元素，O(1)
	Peek() (model.Comparable, error)
}

```
## 2. 实现

```go

type Stack struct {
	array array.IArray
}

func (s *Stack) String() string {
	str := fmt.Sprintf("length=%v, data=[", s.Length())
	for i := 0; i < s.Length(); i++ {
		value, _ := s.array.Get(i)
		str += fmt.Sprintf("%v ", value)
	}
	str = strings.TrimRight(str, " ")
	str += "]"
	return str
}

func NewStack() *Stack {
	return &Stack{array: array.NewArray()}
}

func (s *Stack) Length() int {
	return s.array.Length()
}

func (s *Stack) IsEmpty() bool {
	return s.array.IsEmpty()
}

func (s *Stack) Push(e model.Comparable) error {
	return s.array.AddLast(e)
}

func (s *Stack) Pop() (model.Comparable, error) {
	return s.array.RemoveLast()
}

func (s *Stack) Peek() (model.Comparable, error) {
	return s.array.GetLast()
}
```

### 2.1. 测试

```go
func TestStack(t *testing.T) {
	stack := NewStack()
	fmt.Println(stack)

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e3 := model.NewElement(3)
	stack.Push(e1)
	stack.Push(e2)
	stack.Push(e3)
	fmt.Println(stack)

	fmt.Println(stack.Pop())
	fmt.Println(stack.Pop())

	fmt.Println(stack.Peek())
	fmt.Println(stack)
}
```