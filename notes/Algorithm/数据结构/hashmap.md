## 1. 是什么
- K-V对

## 2. 二叉搜索树实现
### 2.1. 数据结构
- 二叉搜索树
### 2.2. API

```go
type IMap interface {
	//打印map
	String() string
	//map元素个数
	Length() int
	//map是否为空
	IsEmpty() bool
	//往map添加一个元素
	Add(key model.Comparable, value interface{})
	//map是否包含key
	Contains(key model.Comparable) bool
	//获取map中key对应的value
	Get(key model.Comparable) (interface{}, bool)
	//更新map中key对应的value
	Set(key model.Comparable, value interface{})
	//删除map中key对应的元素
	Remove(key model.Comparable)
}

```
### 2.3. 实现
```go


package _map

import (
	"fmt"
	"my_algorithm/model"
	"strings"
)

type node struct {
	key   model.Comparable
	value interface{}
	left  *node
	right *node
}

func (n *node) String() string {
	return fmt.Sprintf("%v:%v", n.key, n.value)
}

func newNode(key model.Comparable, value interface{}) *node {
	return &node{key: key, value: value}
}

type BstMap struct {
	root   *node
	length int
}

func NewBstMap() *BstMap {
	return &BstMap{}
}

func (b *BstMap) String() string {
	s := fmt.Sprintf("length=%v, data={", b.Length())
	inOrderPrint(b.root, &s)
	s = strings.TrimRight(s, " ")
	s += "}"
	return s
}

func inOrderPrint(n *node, s *string) {
	if n == nil {
		return
	}
	inOrderPrint(n.left, s)
	*s += fmt.Sprintf("%v ", n)
	inOrderPrint(n.right, s)

}

func (b *BstMap) Length() int {
	return b.length
}

func (b *BstMap) IsEmpty() bool {
	return b.length == 0
}

func (b *BstMap) Add(key model.Comparable, value interface{}) {
	b.Set(key, value)
}

func (b *BstMap) Contains(key model.Comparable) bool {
	_, ok := b.Get(key)
	return ok
}

func (b *BstMap) Get(key model.Comparable) (interface{}, bool) {
	return get(b.root, key)
}

func get(n *node, key model.Comparable) (interface{}, bool) {
	if n == nil {
		return nil, false
	}
	if key.CompareTo(n.key) < 0 {
		return get(n.left, key)
	} else if key.CompareTo(n.key) > 0 {
		return get(n.right, key)
	} else {
		return n.value, true
	}
}

func (b *BstMap) Set(key model.Comparable, value interface{}) {
	b.root = b.set(b.root, key, value)

}

func (b *BstMap) set(n *node, key model.Comparable, value interface{}) *node {
	if n == nil {
		b.length++
		return newNode(key, value)
	}

	//往左子树替换或者添加
	if key.CompareTo(n.key) < 0 {
		//if n.left == nil {
		//	n.left = newNode(key, value)
		//	b.length++
		//	return n
		//}
		n.left = b.set(n.left, key, value)
		return n
		//往右子树替换或者添加
	} else if key.CompareTo(n.key) > 0 {
		//if n.right == nil {
		//	n.right = newNode(key, value)
		//	b.length++
		//	return n
		//}
		n.right = b.set(n.right, key, value)
		return n
	} else {
		n.value = value
		return n
	}
}

func (b *BstMap) Remove(key model.Comparable) {
	b.root = b.remove(b.root, key)
}

func (b *BstMap) remove(n *node, key model.Comparable) *node {
	if n == nil {
		return nil
	}
	//先找到要删除的节点
	if key.CompareTo(n.key) < 0 {
		n.left = b.remove(n.left, key)
		return n
	} else if key.CompareTo(n.key) > 0 {
		n.right = b.remove(n.right, key)
		return n
	} else {
		//执行删除
		b.length--
		return doRemove(n)
	}
}

func doRemove(n *node) *node {
	if n.left == nil {
		rightNode := n.right
		n.right = nil
		return rightNode
	}
	if n.right == nil {
		leftNode := n.left
		n.left = nil
		return leftNode
	}
	//左右子树都不为空
	//先找到当前节点的前继，即右子树的最小节点代替本节点
	successor := min(n.right)
	successor.right = removeMin(n.right)
	successor.left = n.left
	//删除当前节点
	n.left = nil
	n.right = nil
	return successor
}

func min(n *node) *node {
	if n.left == nil {
		return n
	}
	return min(n.left)
}

func removeMin(n *node) *node {
	//左子树为空，说明当前节点就是最小节点
	//那么删除当前节点，把右子树上移为根节点
	if n.left == nil {
		rightNode := n.right
		n.right = nil
		return rightNode
	}
	n.left = removeMin(n.left)
	return n
}

```

#### 2.3.1. 测试

```go
func TestBstMap(t *testing.T) {
	var bstMap IMap = NewBstMap()
	fmt.Println("初始状态：", bstMap)

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e3 := model.NewElement(3)
	e4 := model.NewElement(4)
	e5 := model.NewElement(5)

	bstMap.Add(e3, "e3")
	bstMap.Add(e1, "e1")
	bstMap.Add(e2, "e2")
	bstMap.Add(e4, "e4")
	bstMap.Add(e5, "e5")

	fmt.Println("添加元素后：", bstMap)

	v, _ := bstMap.Get(e1)
	fmt.Println("e1对应的value：", v)

	bstMap.Remove(e3)
	fmt.Println("删除e3：", bstMap)
	fmt.Println("删除e3对应的value存在么：", bstMap.Contains(e3))
	bstMap.Remove(e3)
	fmt.Println("继续删除e3：", bstMap)

	bstMap.Set(e3, "e3")
	fmt.Println("修改e3：", bstMap)
	bstMap.Set(e3, "ee3")
	fmt.Println("继续修改e3：", bstMap)

}
```


## 3. 哈希表实现
### 3.1. hash函数的设计
- 原则
    - 一致性：如果a==b，则hash（a）==hash（b）
    - 高效性：计算高效简便
    - 均匀性：哈希值均匀分布
#### 3.1.1. 方案一：转换成整型
- 整型
    - 小范围正整数直接使用
    - 小范围负整数进行偏移
    - 大整数对一个素数取模
- 浮点型
    - 本质上都是用32bit或64bit的二进制表示，解析成整型即可
- 字符串
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1610873341_20210117164850463_9925.png)
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1610873343_20210117164859362_5904.png)
- 复合类型
    - 同字符串
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1610873378_20210117164935761_6149.png)

### 3.2. 数据结构
- 数组+链表
### 3.3. API
- 同上
### 3.4. 实现

```go

//素数
const DefaultM = 7

type hashNode struct {
	key   model.Comparable
	value interface{}
}

func (h *hashNode) String() string {
	return fmt.Sprintf("%v:%v", h.key, h.value)
}

func newHashNode(key model.Comparable, value interface{}) *hashNode {
	return &hashNode{key: key, value: value}
}

func hashKey(key model.Comparable) *hashNode {
	return &hashNode{key: key, value: nil}
}

func (h *hashNode) CompareTo(other model.Comparable) int {
	otherHashNode, ok := other.(*hashNode)
	if !ok {
		panic("other is not hashNode")
	}
	return h.key.CompareTo(otherHashNode.key)
}

type HashMap struct {
	//数组，数组中每个元素是个链表
	table []list.IList
	//table长度
	M int
	//元素个数
	length int
}

func NewHashMap() *HashMap {
	table := make([]list.IList, DefaultM)
	for i := 0; i < len(table); i++ {
		table[i] = list.NewDoubleLinkedList()
	}
	return &HashMap{
		table:  table,
		length: 0,
		M:      DefaultM,
	}
}

func (h *HashMap) String() string {
	s := fmt.Sprintf("length=%v, M=%v, data={", h.length, h.M)

	for i := 0; i < len(h.table); i++ {
		slot := h.table[i]
		if slot.Length() > 0 {
			s += fmt.Sprintf("[slot-%v]: ", i)
			for i := 0; i < slot.Length(); i++ {
				n, _ := slot.Get(i)
				hNode := n.(*hashNode)
				s += fmt.Sprintf("%v ", hNode)
			}
			s = strings.TrimRight(s, " ")
			s += "\n"
		}
	}

	s += "}"
	return s
}

func (h *HashMap) Length() int {
	return h.length
}

func (h *HashMap) IsEmpty() bool {
	return h.length == 0
}

//计算key的hashCode
func hashCode(key interface{}) int {
	str := fmt.Sprintf("%v", key)
	v := int(crc32.ChecksumIEEE([]byte(str)))
	if v >= 0 {
		return v
	}
	return -v
}

//计算key落在哪个slot
func (h *HashMap) hash(key model.Comparable) int {
	return (hashCode(key) & 0x7fffffff) % h.M
}

func (h *HashMap) Add(key model.Comparable, value interface{}) {
	h.Set(key, value)
}

func (h *HashMap) Contains(key model.Comparable) bool {
	slot := h.table[h.hash(key)]
	return slot.Contains(hashKey(key))
}

func (h *HashMap) Get(key model.Comparable) (interface{}, bool) {
	slot := h.table[h.hash(key)]
	n, err := slot.Get(slot.Find(hashKey(key)))
	if err != nil {
		return nil, false
	}

	n2, ok := n.(*hashNode)
	if ok {
		return n2.value, true
	}
	return nil, false
}

func (h *HashMap) Set(key model.Comparable, value interface{}) {
	slot := h.table[h.hash(key)]
	index := slot.Find(hashKey(key))
	if index != -1 {
		slot.Set(index, newHashNode(key, value))
		return
	}
	slot.AddLast(newHashNode(key, value))
	h.length++
}

func (h *HashMap) Remove(key model.Comparable) {
	slot := h.table[h.hash(key)]
	if slot.RemoveElement(hashKey(key)) {
		h.length--
	}
}

```

#### 3.4.1. 测试

```go

func TestHashMap(t *testing.T) {
	var hashMap IMap = NewHashMap()
	fmt.Println("初始状态：", hashMap)

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e3 := model.NewElement(3)
	e4 := model.NewElement(4)
	e5 := model.NewElement(5)

	hashMap.Add(e3, "e3")
	hashMap.Add(e1, "e1")
	hashMap.Add(e2, "e2")
	hashMap.Add(e4, "e4")
	hashMap.Add(e5, "e5")

	fmt.Println("添加元素后：", hashMap)

	v, _ := hashMap.Get(e1)
	fmt.Println("e1对应的value：", v)

	hashMap.Remove(e3)
	fmt.Println("删除e3：", hashMap)
	fmt.Println("删除e3对应的value存在么：", hashMap.Contains(e3))
	hashMap.Remove(e3)
	fmt.Println("继续删除e3：", hashMap)

	hashMap.Set(e3, "e3")
	fmt.Println("修改e3：", hashMap)
	hashMap.Set(e3, "ee3")
	fmt.Println("继续修改e3：", hashMap)
}
```