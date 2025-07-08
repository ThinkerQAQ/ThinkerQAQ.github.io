## 1. 是什么
- 一种树结构，区别在于是孩子指向父亲
## 2. 有什么用
- 解决连接问题（比路径问题更加简单）
## 3. 实现

### 3.1. API

```go
type IUnionFind interface {
	// 获取并查集的长度
	GetSize() int
	// id为p和id为q的元素是否属于同一个集合
	IsConnected(p int, q int) (bool,error)
	// 合并id为p和id为q的元素到一个集合
	UnionElements(p int, q int) error
}

```


### 3.2. Quick Find

```go

import "fmt"

type QuickFind struct {
	//index表示id，value表示id所属的集合
	id []int
}

func NewQuickFind(size int) *QuickFind {
	quickFind := &QuickFind{id: make([]int, size)}

	for i := 0; i < len(quickFind.id); i++ {
		quickFind.id[i] = i
	}

	return quickFind
}

func (qf *QuickFind) GetSize() int {
	return len(qf.id)
}

// O（1）
// 查找id为p和元素和id为q的元素是否同一个集合
func (qf *QuickFind) IsConnected(p int, q int) (bool, error) {
	setP, err := qf.find(p)
	if err != nil {
		return false, err
	}
	setQ, err := qf.find(q)
	if err != nil {
		return false, err
	}

	return setQ == setP, nil

}

// 查找id为p的元素对应的集合
func (qf *QuickFind) find(p int) (int, error) {
	if p < 0 || p > len(qf.id) {
		return 0, fmt.Errorf("out of bound")
	}
	return qf.id[p], nil
}

// O（N）
// 合并id为p和id为q的元素到一个集合
func (qf *QuickFind) UnionElements(p int, q int) error {
	setP, err := qf.find(p)
	if err != nil {
		return err
	}
	setQ, err := qf.find(q)
	if err != nil {
		return err
	}

	if setQ == setP {
		return nil
	}

	for i := 0; i < len(qf.id); i++ {
		if qf.id[i] == setP {
			qf.id[i] = setQ
		}
	}

	return nil
}

```
#### 3.2.1. 测试

```go
func TestQuickFind(t *testing.T) {
	quickFind := NewQuickFind(10)
	fmt.Println(quickFind.GetSize())

	fmt.Println(quickFind.IsConnected(1,2))
	quickFind.UnionElements(1,2)
	fmt.Println(quickFind.IsConnected(1,2))
}

```
### 3.3. Quick Union
- ![](https://raw.githubusercontent.com/TDoct/images/master/1616224132_20210320150849581_17440.png)

```go
package unionfind

import "fmt"

type QuickUnion struct {
	parent []int
}

func NewQuickUnion(size int) *QuickUnion {
	quickUnion := &QuickUnion{parent: make([]int, size)}
	for i := 0; i < size; i++ {
		quickUnion.parent[i] = i
	}
	return quickUnion
}

func (qu *QuickUnion) GetSize() int {
	return len(qu.parent)
}

// O(h)，h为树的高度
// 查找id为p的元素对应的集合
func (qu *QuickUnion) find(p int) (int, error) {
	if p < 0 || p > len(qu.parent) {
		return 0, fmt.Errorf("out of bound")
	}

	for p != qu.parent[p] {
		p = qu.parent[p]
	}

	return p, nil
}

// O(h)，h为树的高度
// 查找id为p和元素和id为q的元素是否同一个集合
func (qu *QuickUnion) IsConnected(p int, q int) (bool, error) {
	setP, err := qu.find(p)
	if err != nil {
		return false, err
	}
	setQ, err := qu.find(q)
	if err != nil {
		return false, err
	}

	return setQ == setP, nil
}
// O(h)，h为树的高度
// 合并id为p和id为q的元素到一个集合
func (qu *QuickUnion) UnionElements(p int, q int) error {
	setP, err := qu.find(p)
	if err != nil {
		return err
	}
	setQ, err := qu.find(q)
	if err != nil {
		return err
	}

	if setQ == setP {
		return nil
	}

	qu.parent[setP] = setQ
	return nil
}

```

#### 3.3.1. 测试
```go
func TestQuickUnion(t *testing.T) {
	quickUnion := NewQuickUnion(10)
	fmt.Println(quickUnion.GetSize())

	fmt.Println(quickUnion.IsConnected(1,2))
	quickUnion.UnionElements(1,2)
	fmt.Println(quickUnion.IsConnected(1,2))
}

```


### 3.4. 基于size的优化

```go
package unionfind

import "fmt"

type QuickUnion2 struct {
	parent []int
	sz     []int
}

func NewQuickUnion2(size int) *QuickUnion2 {
	quickUnion2 := &QuickUnion2{
		parent: make([]int, size),
		sz:     make([]int, size)}
	for i := 0; i < size; i++ {
		quickUnion2.parent[i] = i
		quickUnion2.sz[i] = 1
	}
	return quickUnion2
}

func (qu *QuickUnion2) GetSize() int {
	return len(qu.parent)
}

// O(h)，h为树的高度
// 查找id为p的元素对应的集合
func (qu *QuickUnion2) find(p int) (int, error) {
	if p < 0 || p > len(qu.parent) {
		return 0, fmt.Errorf("out of bound")
	}

	for p != qu.parent[p] {
		p = qu.parent[p]
	}

	return p, nil
}

// O(h)，h为树的高度
// 查找id为p和元素和id为q的元素是否同一个集合
func (qu *QuickUnion2) IsConnected(p int, q int) (bool, error) {
	setP, err := qu.find(p)
	if err != nil {
		return false, err
	}
	setQ, err := qu.find(q)
	if err != nil {
		return false, err
	}

	return setQ == setP, nil
}

// O(h)，h为树的高度
// 合并id为p和id为q的元素到一个集合
func (qu *QuickUnion2) UnionElements(p int, q int) error {
	setP, err := qu.find(p)
	if err != nil {
		return err
	}
	setQ, err := qu.find(q)
	if err != nil {
		return err
	}

	if setQ == setP {
		return nil
	}

	//将元素少的集合合并到元素多的集合上
	if qu.sz[setP] < qu.sz[setQ] {
		qu.parent[setP] = setQ
		qu.sz[setQ] += qu.sz[setP]
	} else {
		qu.parent[setQ] = setP
		qu.sz[setP] += qu.sz[setQ]
	}

	return nil
}

```

#### 3.4.1. 测试
```go
func TestQuickUnion2(t *testing.T) {
	quickUnion := NewQuickUnion2(10)
	fmt.Println(quickUnion.GetSize())

	fmt.Println(quickUnion.IsConnected(1,2))
	quickUnion.UnionElements(1,2)
	fmt.Println(quickUnion.IsConnected(1,2))
}


```


### 3.5. 基于rank的优化

```go
package unionfind

import "fmt"

type QuickUnion3 struct {
	parent []int
	rank   []int
}

func NewQuickUnion3(size int) *QuickUnion3 {
	quickUnion := &QuickUnion3{
		parent: make([]int, size),
		rank:   make([]int, size)}
	for i := 0; i < size; i++ {
		quickUnion.parent[i] = i
		quickUnion.rank[i] = 1
	}
	return quickUnion
}

func (qu *QuickUnion3) GetSize() int {
	return len(qu.parent)
}

// O(h)，h为树的高度
// 查找id为p的元素对应的集合
func (qu *QuickUnion3) find(p int) (int, error) {
	if p < 0 || p > len(qu.parent) {
		return 0, fmt.Errorf("out of bound")
	}

	for p != qu.parent[p] {
		p = qu.parent[p]
	}

	return p, nil
}

// O(h)，h为树的高度
// 查找id为p和元素和id为q的元素是否同一个集合
func (qu *QuickUnion3) IsConnected(p int, q int) (bool, error) {
	setP, err := qu.find(p)
	if err != nil {
		return false, err
	}
	setQ, err := qu.find(q)
	if err != nil {
		return false, err
	}

	return setQ == setP, nil
}

// O(h)，h为树的高度
// 合并id为p和id为q的元素到一个集合
func (qu *QuickUnion3) UnionElements(p int, q int) error {
	setP, err := qu.find(p)
	if err != nil {
		return err
	}
	setQ, err := qu.find(q)
	if err != nil {
		return err
	}

	if setQ == setP {
		return nil
	}

	//将元素少的集合合并到元素多的集合上
	if qu.rank[setP] < qu.rank[setQ] {
		qu.parent[setP] = setQ
	} else if qu.rank[setP] > qu.rank[setQ] {
		qu.parent[setQ] = setP
	} else {
		qu.parent[setQ] = setP
		qu.rank[setP] += 1
	}

	return nil
}

```

#### 3.5.1. 测试

```go
func TestQuickUnion3(t *testing.T) {
	quickUnion := NewQuickUnion3(10)
	fmt.Println(quickUnion.GetSize())

	fmt.Println(quickUnion.IsConnected(1,2))
	quickUnion.UnionElements(1,2)
	fmt.Println(quickUnion.IsConnected(1,2))
}

```

### 3.6. 路径压缩
- ![](https://raw.githubusercontent.com/TDoct/images/master/1616226726_20210320155204071_18562.png)

```go
package unionfind

import "fmt"

type QuickUnion4 struct {
	parent []int
	rank   []int
}

func NewQuickUnion4(size int) *QuickUnion4 {
	quickUnion := &QuickUnion4{
		parent: make([]int, size),
		rank:   make([]int, size)}
	for i := 0; i < size; i++ {
		quickUnion.parent[i] = i
		quickUnion.rank[i] = 1
	}
	return quickUnion
}

func (qu *QuickUnion4) GetSize() int {
	return len(qu.parent)
}

// O(h)，h为树的高度
// 查找id为p的元素对应的集合
func (qu *QuickUnion4) find(p int) (int, error) {
	if p < 0 || p > len(qu.parent) {
		return 0, fmt.Errorf("out of bound")
	}

	for p != qu.parent[p] {
		qu.parent[p] = qu.parent[qu.parent[p]]
		p = qu.parent[p]
	}

	return p, nil
}

// O(h)，h为树的高度
// 查找id为p和元素和id为q的元素是否同一个集合
func (qu *QuickUnion4) IsConnected(p int, q int) (bool, error) {
	setP, err := qu.find(p)
	if err != nil {
		return false, err
	}
	setQ, err := qu.find(q)
	if err != nil {
		return false, err
	}

	return setQ == setP, nil
}

// O(h)，h为树的高度
// 合并id为p和id为q的元素到一个集合
func (qu *QuickUnion4) UnionElements(p int, q int) error {
	setP, err := qu.find(p)
	if err != nil {
		return err
	}
	setQ, err := qu.find(q)
	if err != nil {
		return err
	}

	if setQ == setP {
		return nil
	}

	//将元素少的集合合并到元素多的集合上
	if qu.rank[setP] < qu.rank[setQ] {
		qu.parent[setP] = setQ
	} else if qu.rank[setP] > qu.rank[setQ] {
		qu.parent[setQ] = setP
	} else {
		qu.parent[setQ] = setP
		qu.rank[setP] += 1
	}

	return nil
}

```

#### 3.6.1. 测试

```go
func TestQuickUnion4(t *testing.T) {
	quickUnion := NewQuickUnion4(10)
	fmt.Println(quickUnion.GetSize())

	fmt.Println(quickUnion.IsConnected(1,2))
	quickUnion.UnionElements(1,2)
	fmt.Println(quickUnion.IsConnected(1,2))
}

```