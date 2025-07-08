## 1. 是什么
- 可动态扩容的数组

## 2. 动态数组
### 2.1. 数据结构
- 存放数据的数组
- 已使用的长度
- 总长度
### 2.2. API

```go
type IArray interface {
	//打印所有元素
	String() string
	//已使用的长度
	Length() int
	//总长度
	Capacity() int
	//是否为空
	IsEmpty() bool
	//index为0的位置添加一个元素，其他后移
	AddFirst(e model.Comparable) error
	//index为length-1的位置添加一个元素，其他后移
	AddLast(e model.Comparable) error
	//index的位置添加一个元素，其他后移
	Add(index int, e model.Comparable) error
	//获取最后一个元素
	GetLast() (model.Comparable, error)
	//获取第一个元素
	GetFirst() (model.Comparable, error)
	//获取index位置的元素
	Get(index int) (model.Comparable, error)
	//更新index位置的元素为e
	Set(index int, e model.Comparable) error
	//是否包含e
	Contains(e model.Comparable) bool
	//找到e，返回下标
	Find(e model.Comparable) int
	//index的位置删除一个元素，其他前移
	Remove(index int) (model.Comparable, error)
	//index为0的位置删除一个元素，其他前移
	RemoveFirst() (model.Comparable, error)
	//index为length-1的位置删除一个元素，其他前移
	RemoveLast() (model.Comparable, error)
	//删除e，返回下标
	RemoveElement(e model.Comparable) int
	//交换数组中的两个元素
	swap(i int, j int) error
}

```
### 2.3. 实现

```go

const (
	DefaultSize = 1
	NonExists   = -1
)

type Array struct {
	array    []model.Comparable
	length   int
	capacity int
}

func (a *Array) swap(i int, j int) error {
	if i < 0 || i >= a.Length() || j < 0 || j >= a.Length() {
		return fmt.Errorf("out of bound")
	}
	tmp := a.array[i]
	a.array[i] = a.array[j]
	a.array[j] = tmp
	return nil
}

func NewArray() *Array {
	return &Array{
		array:    make([]model.Comparable, DefaultSize),
		length:   0,
		capacity: DefaultSize,
	}
}

func (a *Array) String() string {
	s := fmt.Sprintf("length=%v, capacity=%v, data=[", a.Length(), a.Capacity())
	for i := 0; i < a.Length(); i++ {
		s += fmt.Sprintf("%v ", a.array[i])
	}
	s = strings.TrimRight(s, " ")
	s += "]"
	return s
}

func (a *Array) Length() int {
	return a.length
}

func (a *Array) Capacity() int {
	return a.capacity
}

func (a *Array) IsEmpty() bool {
	return a.Length() == 0
}

// O(N)
func (a *Array) AddFirst(e model.Comparable) error {
	return a.Add(0, e)
}

// O(1)
func (a *Array) AddLast(e model.Comparable) error {
	return a.Add(a.Length(), e)
}

// O(N)
func (a *Array) Add(index int, e model.Comparable) error {
	if index < 0 || index > a.Length() {
		return fmt.Errorf("out of bound")
	}

	if a.Length() == a.Capacity() {
		a.resize(a.Capacity() * 2)
	}

	for i := a.Length(); i > index; i-- {
		a.array[i] = a.array[i-1]
	}
	a.array[index] = e
	a.length++

	return nil
}

// O(1)
func (a *Array) GetLast() (model.Comparable, error) {
	return a.Get(a.Length() - 1)
}

// O(1)
func (a *Array) GetFirst() (model.Comparable, error) {
	return a.Get(0)
}

// O(1)
func (a *Array) Get(index int) (model.Comparable, error) {
	if index < 0 || index >= a.Capacity() {
		return nil, fmt.Errorf("out of bound")
	}

	return a.array[index], nil
}

// O(1)
func (a *Array) Set(index int, e model.Comparable) error {
	if index < 0 || index >= a.Capacity() {
		return fmt.Errorf("out of bound")
	}

	a.array[index] = e
	return nil
}

// O(N)
func (a *Array) Contains(e model.Comparable) bool {
	return a.Find(e) != NonExists
}

// O(N)
func (a *Array) Find(e model.Comparable) int {
	for i := 0; i < a.Length(); i++ {
		value, _ := a.Get(i)
		if value.CompareTo(e) == 0 {
			return i
		}
	}
	return NonExists
}

// O(N)
func (a *Array) Remove(index int) (model.Comparable, error) {
	if index < 0 || index >= a.Length() {
		return nil, fmt.Errorf("out of bound")
	}
	removed := a.array[index]
	for i := index; i < a.Length()-1; i++ {
		a.array[i] = a.array[i+1]
	}

	a.array[a.Length()-1] = nil
	a.length--
	if a.Length() == a.Capacity()/4 {
		a.resize(a.Capacity() / 2)
	}

	return removed, nil
}

// O(N)
func (a *Array) RemoveFirst() (model.Comparable, error) {
	return a.Remove(0)
}

// O(1)
func (a *Array) RemoveLast() (model.Comparable, error) {
	return a.Remove(a.Length() - 1)
}

// O(N)
func (a *Array) RemoveElement(e model.Comparable) int {
	index := a.Find(e)
	if index == NonExists {
		return NonExists
	}

	a.Remove(index)
	return index

}

func (a *Array) resize(newCapacity int) {
	newArray := make([]model.Comparable, newCapacity)
	for i := 0; i < a.Length(); i++ {
		newArray[i] = a.array[i]
	}
	a.array = newArray
	a.capacity = newCapacity
}
```

#### 2.3.1. 测试
```go

func TestArray(t *testing.T) {
	array := NewArray()
	fmt.Println(array)

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e0 := model.NewElement(0)
	array.AddLast(e1)
	array.AddLast(e2)
	array.AddFirst(e0)
	fmt.Println(array)

	array.swap(0, array.Length() - 1)
	fmt.Println(array)

	array.RemoveFirst()
	array.RemoveLast()
	fmt.Println(array)

	fmt.Println(array.Contains(e1))
	fmt.Println(array.Find(e1))
	fmt.Println(array.RemoveElement(e1))
	fmt.Println(array)
	fmt.Println(array.IsEmpty())
}


```

## 3. 刷题套路
### 3.1. 双指针
#### 3.1.1. 同向
- ![](https://raw.githubusercontent.com/TDoct/images/master/1613134202_20210212204829746_18077.png)
    - `[0, i)`是处理好的数据，`[i, j)`是处理过但不需要的数据， `[j, array.length)`是待处理的数据
    - 步骤
        - 初始化`i=0, j=0`
        - `while j < array.length`
            - 如果需要`array[j]`，保持`array[i]=array[j]`，然后前移i
            - 否则跳过他
#### 3.1.2. 反向
- ![](https://raw.githubusercontent.com/TDoct/images/master/1613134203_20210212204906671_31268.png)
    - `[0, i)`、`(j, array.length)`是处理好的数据，`[i, j]`的数据待处理
    - 步骤
        - 初始化`i=0, j=array.length-1`
        - `while i<=j`
            - 处理array[i]和array[j]
            - 将i或者j移动