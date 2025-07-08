## 1. 堆是什么
逻辑上看成一棵树，实际上是个数组。

- 位置关系
在数组起始位置为0的情形中：
    - 父节点i的左子节点在位置`2 * i + 1`
    - 父节点i的右子节点在位置`2 * i + 2`
    - 子节点i的父节点在位置`(i - 1) / 2`
- 排序属性
    - 最大堆：父节点的值>左右节点
    - 最小堆：父节点的值<左右节点

## 2. 最大堆
### 2.1. 数据结构
- 动态数组
### 2.2. API

```go
type IMaxHeap interface {
	//打印大顶堆中所有元素
	String() string
	//获取大顶堆中元素个数
	Length() int
	//大顶堆是否为空
	IsEmpty() bool
	//往大顶堆中添加一个元素 O(logN)
	Add(e model.Comparable) error
	//删除大顶堆中最大的元素 O(logN)
	ExtractMax() (model.Comparable, error)
	//获取大顶堆中最大的元素
	FindMax() (model.Comparable, error)
}

```
### 2.3. 实现

```go

const NonExists = -1

type MaxHeap struct {
	array array.IArray
}

func NewMaxHeap(data ...model.Comparable) *MaxHeap {
	newArray := array.NewArray()
	for _, e := range data {
		_ = newArray.AddLast(e)
	}

	m := &MaxHeap{array: newArray}
	m.heapify()
	return m
}

func (m *MaxHeap) String() string {
	return fmt.Sprintf("array: %v", m.array)
}

func (m *MaxHeap) Length() int {
	return m.array.Length()
}

func (m *MaxHeap) IsEmpty() bool {
	return m.array.IsEmpty()
}

func (m *MaxHeap) Add(e model.Comparable) error {
	// 先插入到最后面
	_ = m.array.AddLast(e)
	// 插入了一个元素到最后位置，这个元素可能是最大的
	// 需要从这个元素开始往上调整堆序--把大的上移
	m.siftUp(m.Length() - 1)
	return nil
}

// 获取父节点的下标
func (m *MaxHeap) parent(index int) (int, error) {
	if index <= 0 {
		return NonExists, fmt.Errorf("out of bound")
	}

	return (index - 1) / 2, nil
}

// 获取左孩子的下标
func (m *MaxHeap) leftChild(index int) int {
	return index*2 + 1
}

// 获取右孩子的下标
func (m *MaxHeap) rightChild(index int) int {
	return index*2 + 2
}

func (m *MaxHeap) ExtractMax() (model.Comparable, error) {
	max, err := m.FindMax()
	if err != nil {
		return nil, err
	}
	m.swap(0, m.array.Length()-1)
	_, _ = m.array.RemoveLast()
	//把最后一个元素移动到顶部后，这个元素可能是最小的
	//需要从这个元素开始往下调整堆序--把小的下移
	m.siftDown(0)

	return max, nil
}

func (m *MaxHeap) FindMax() (model.Comparable, error) {
	if m.IsEmpty() {
		return nil, fmt.Errorf("heap is empty")
	}

	return m.array.Get(0)
}

func (m *MaxHeap) siftUp(childIndex int) {

	for childIndex > 0 {
		parentIndex, _ := m.parent(childIndex)
		parent, _ := m.array.Get(parentIndex)
		child, _ := m.array.Get(childIndex)

		if child.CompareTo(parent) <= 0 {
			break
		}

		m.swap(parentIndex, childIndex)

		childIndex = parentIndex
	}
}

func (m *MaxHeap) swap(i int, j int) {
	a, _ := m.array.Get(i)
	b, _ := m.array.Get(j)
	_ = m.array.Set(i, b)
	_ = m.array.Set(j, a)

}

func (m *MaxHeap) siftDown(parentIndex int) {
	//终止条件为一半，因为从这里开始没有左右孩子
	half := m.array.Length() / 2
	for parentIndex < half {
		leftChildIndex := m.leftChild(parentIndex)
		rightChildIndex := m.rightChild(parentIndex)

		//先假设左孩子是最大的
		maxIndex := leftChildIndex
		maxChild, _ := m.array.Get(maxIndex)
		//如果右孩子存在且右孩子比较大，那么更新maxXXX
		if rightChildIndex < m.Length() {
			rightChild, _ := m.array.Get(rightChildIndex)
			if rightChild.CompareTo(maxChild) > 0 {
				maxChild = rightChild
				maxIndex = rightChildIndex
			}
		}

		parent, _ := m.array.Get(parentIndex)
		if maxChild.CompareTo(parent) <= 0 {
			break
		}

		//把父亲和较大的孩子交换
		m.swap(parentIndex, maxIndex)
		parentIndex = maxIndex
	}

}

// O(NlogN)
func (m *MaxHeap) heapify() {
	//从有子节点的节点开始，下沉维护堆的属性
	for i := m.array.Length()>>1 - 1; i >= 0; i-- {
		m.siftDown(i)
	}
}

```

#### 2.3.1. 测试

```go
func TestHeap(t *testing.T) {
	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e3 := model.NewElement(3)
	e4 := model.NewElement(4)
	e5 := model.NewElement(5)

	heap := NewMaxHeap(e1, e2, e3, e4, e5)
	fmt.Println(heap)

	for i := 5; i < 10; i++ {
		e := model.NewElement(i)
		_ = heap.Add(e)
	}
	fmt.Println(heap)

	for !heap.IsEmpty() {
		max, _ := heap.ExtractMax()
		fmt.Println(max)
	}

}
```

## 3. 最小堆
特点：父节点的值 < 左右节点
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200116145205.png)

- 建堆
    - 从最右边的叶子节点出发，执行上浮操作，一直到一半为止
    - 或者是从最右边的有叶子节点的那个节点开始，执行下沉操作，一直到root节点为止
- 插入操作
    - 把值插入到数组末尾（就是最右边的叶子节点），然后上浮维护最小堆的性质

- 删除操作
    - 取出数组第一个元素（就是root），然后把数组末尾的元素放到第一个元素中（就是把最右边的叶子节点放到root），接着执行下沉操作维护最小堆的性质

## 4. 实现
[PriorityQueue.md](../Java/JDK/Queue/PriorityQueue.md)