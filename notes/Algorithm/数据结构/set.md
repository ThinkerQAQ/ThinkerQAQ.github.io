## 1. 是什么
- 无序、不重复的集合

### 1.1. 数据结构
- hashmap
### 1.2. API

```go
type ISet interface {
	//打印set
	String() string
	//set中元素个数
	Length() int
	//set是否为空
	IsEmpty() bool
	//set中添加一个元素
	Add(data model.Comparable)
	//set中删除一个元素
	Remove(data model.Comparable)
	//set是否包含一个元素
	Contains(data model.Comparable) bool
}

```

### 1.3. 实现

```go

type Set struct {
	m _map.IMap
}

func NewBstSet() *Set {
	return &Set{m: _map.NewBstMap()}
}

func (b *Set) String() string {
	return b.m.String()
}

func (b *Set) Length() int {
	return b.m.Length()
}

func (b *Set) IsEmpty() bool {
	return b.m.IsEmpty()
}

func (b *Set) Add(data model.Comparable) {
	b.m.Add(data, nil)
}

func (b *Set) Remove(data model.Comparable) {
	b.m.Remove(data)
}

func (b *Set) Contains(data model.Comparable) bool {
	return b.m.Contains(data)
}
```

#### 1.3.1. 测试
```go
func TestBstSet(t *testing.T) {
	set := NewBstSet()
	fmt.Println("初始set：",set)

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e3 := model.NewElement(3)
	e4 := model.NewElement(4)
	e5 := model.NewElement(5)
	set.Add(e1)
	set.Add(e2)
	set.Add(e3)
	set.Add(e4)
	set.Add(e5)
	set.Add(e5)

	fmt.Println("添加元素后的set：",set)
	fmt.Println("是否包含e1：", set.Contains(e1))

	set.Remove(e1)
	fmt.Println("删除e1后的set：", set)


}

```