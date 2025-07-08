## 1. 图是什么
- 由边和顶点组成
## 2. 图分类
|        |   有方向   |   无方向   |
| ------ | --------- | --------- |
| 有权重 | 有向有权图 | 无向有权图 |
| 无权重 | 有向无权图 |    无向无权图       |


## 3. 图的表示

### 3.1. 邻接矩阵
- 用二维数组存储顶点之间的关系：两顶点相邻则为1，不相邻则为 0
- ![](https://raw.githubusercontent.com/TDoct/images/master/1613744540_20210219221344608_8963.png)
### 3.2. 邻接表
- 就是把从同一个顶点发出的边链接在一个单链表中
- ![](https://raw.githubusercontent.com/TDoct/images/master/1613744542_20210219221421092_4554.png)

## 4. 图的遍历
### 4.1. 深度优先
- 树 vs 图
    - 区别在于图需要记录每个节点是否访问过
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1613744543_20210219222049585_19283.png)

### 4.2. 广度优先

- 树 vs 图
    - 区别在于图需要记录每个节点是否访问过
## 5. 实现
### 5.1. API
```go
type IGraph interface {
	//打印所有元素
	String() string
	//顶点的数目
	V() int
	//边的数目
	E() int
	//x和y是否有边
	HasEdge(x int, y int) bool
	//获取顶点v关联的所有顶点
	Adj(v int) []int
	//获取指定结点的度，即相邻的结点的数量
	Degree(v int) int
	//深度优先遍历
	Dfs() []int
	//广度优先遍历
	Bfs() []int
}

```

### 5.2. 邻接矩阵

```go

//邻接矩阵表示法
//空间复杂度：O(V²)
type AdjMatrix struct {
	//顶点个数
	v int
	//边个数
	e int
	//使用二维度数组存储
	adj [][]int
}

//时间复杂度：O(E)
func NewAdjMatrix(edges []int) *AdjMatrix {
	v := edges[0]
	e := edges[1]
	adjMatrix := &AdjMatrix{v: v, e: e}

	adj := make([][]int, v, v)
	for i := 0; i < len(adj); i++ {
		adj[i] = make([]int, v, v)
	}
	for i := 2; i < len(edges)-2; i += 2 {
		a := edges[i]
		b := edges[i+1]
		adjMatrix.validateVertex(a)
		adjMatrix.validateVertex(b)

		adj[a][b] = 1
		adj[b][a] = 1
	}
	adjMatrix.adj = adj
	return adjMatrix
}

func (a *AdjMatrix) V() int {
	return a.v
}

func (a *AdjMatrix) E() int {
	return a.e

}

func (a *AdjMatrix) String() string {
	s := fmt.Sprintf("v=%v, e=%v, adj={\n", a.v, a.e)
	for i := 0; i < a.v; i++ {
		for j := 0; j < a.v; j++ {
			s += fmt.Sprintf("%d ", a.adj[i][j])
		}
		s += "\n"
	}
	s += "}"
	return s
}

// 获取指定结点相邻的结点
// 时间复杂度：O(V)
func (a *AdjMatrix) Adj(v int) []int {
	a.validateVertex(v)
	res := make([]int, 0)

	for i := 0; i < a.v; i++ {
		if a.adj[v][i] == 1 {
			res = append(res, i)
		}
	}

	return res
}

// 时间复杂度：O(1)
func (a *AdjMatrix) HasEdge(x int, y int) bool {
	a.validateVertex(x)
	a.validateVertex(y)

	return a.adj[x][y] == 1
}

func (a *AdjMatrix) Dfs() []int {
	res := make([]int, 0)
	visited := make([]bool, a.v, a.v)

	for i := 0; i < a.V(); i++ {
		if !visited[i] {
			a.dfs(i, &res, visited)
		}
	}

	//for i := a.V()-1; i >= 0; i-- {
	//	if !visited[i] {
	//		a.dfs(i, &res, visited)
	//	}
	//}

	return res
}

func (a *AdjMatrix) dfs(v int, res *[]int, visited []bool) {
	visited[v] = true
	*res = append(*res, v)

	for _, adj := range a.Adj(v) {
		if !visited[adj] {
			a.dfs(adj, res, visited)
		}
	}
}

func (a *AdjMatrix) Degree(v int) int {
	return len(a.adj[v])
}

func (a *AdjMatrix) validateVertex(v int) {
	if v < 0 || v > a.v {
		panic(fmt.Sprintf("V: %v invalid", v))
	}
}

func (a *AdjMatrix) Bfs() []int {
	res := make([]int, 0)
	visited := make([]bool, a.v, a.v)

	for i := 0; i < a.V(); i++ {
		if !visited[i] {
			a.bfs(i, &res, visited)
		}
	}

	return res
}

func (a *AdjMatrix) bfs(v int, res *[]int, visited []bool) {
	queue := make([]int, 0)
	queue = append(queue, v)
	visited[v] = true
	for len(queue) > 0 {
		removed := queue[0]
		queue = queue[1:]

		*res = append(*res, removed)

		lst := a.adj[v]
		for _, w := range lst {

			if !visited[w] {
				queue = append(queue, w)
				visited[w] = true
			}
		}

	}
}
```

#### 5.1.1. 测试

```go
func TestAdjMatrix(t *testing.T) {
	adjMatrix := NewAdjMatrix([]int{
		7, 9,
		0, 1,
		0, 3,
		1, 2,
		1, 6,
		2, 3,
		2, 5,
		3, 4,
		4, 5,
		5, 6})
	fmt.Println(adjMatrix)
	fmt.Println(adjMatrix.Dfs())
	fmt.Println(adjMatrix.Bfs())
}
```

### 5.2. 邻接表

```go

//邻接表表示法
//空间复杂度：O(V+E)
type AdjList struct {
	//顶点个数
	v int
	//边个数
	e int
	//使用链表数组存储
	adj []*list.List
}

//时间复杂度：O(E*V)
func NewAdjList(edges []int) *AdjList {
	v := edges[0]
	e := edges[1]

	adjList := &AdjList{v: v, e: e}
	adj := make([]*list.List, v, v)
	for i := 0; i < len(adj); i++ {
		adj[i] = list.New()
	}
	for i := 2; i < len(edges)-2; i += 2 {
		a := edges[i]
		b := edges[i+1]
		adjList.validateVertex(a)
		adjList.validateVertex(b)

		adj[a].PushBack(b)
		adj[b].PushBack(a)
	}

	adjList.adj = adj
	return adjList
}

func (a *AdjList) V() int {
	return a.v
}

func (a *AdjList) E() int {
	return a.e
}

func (a *AdjList) String() string {
	s := fmt.Sprintf("v=%v, e=%v, adj={\n", a.v, a.e)
	for i := 0; i < a.v; i++ {
		lst := a.adj[i]
		for element := lst.Front(); element != nil; element = element.Next() {
			s += fmt.Sprintf("%d ", element.Value)
		}
		s += "\n"
	}
	s += "}"
	return s
}

// 获取指定结点相邻的结点
//时间复杂度：O(degree(V))
func (a *AdjList) Adj(v int) []int {
	a.validateVertex(v)

	res := make([]int, 0)

	lst := a.adj[v]
	for element := lst.Front(); element != nil; element = element.Next() {
		res = append(res, element.Value.(int))
	}

	return res
}

//时间复杂度：O(degree(V))
func (a *AdjList) HasEdge(x int, y int) bool {
	a.validateVertex(x)
	a.validateVertex(y)

	lst := a.adj[x]
	for element := lst.Front(); element != nil; element = element.Next() {
		if element.Value.(int) == y {
			return true
		}
	}

	return false
}

func (a *AdjList) Dfs() []int {
	res := make([]int, 0)
	visited := make([]bool, a.v, a.v)

	for i := 0; i < a.V(); i++ {
		if !visited[i] {
			a.dfs(i, &res, visited)
		}
	}

	return res
}

func (a *AdjList) dfs(v int, res *[]int, visited []bool) {
	visited[v] = true
	*res = append(*res, v)

	for _, adj := range a.Adj(v) {
		if !visited[adj] {
			a.dfs(adj, res, visited)
		}
	}
}

func (a *AdjList) Degree(v int) int {
	return a.adj[v].Len()
}

func (a *AdjList) validateVertex(v int) {
	if v < 0 || v > a.v {
		panic(fmt.Sprintf("V: %v invalid", v))
	}
}

func (a *AdjList) Bfs() []int {
	res := make([]int, 0)
	visited := make([]bool, a.v, a.v)

	for i := 0; i < a.V(); i++ {
		if !visited[i] {
			a.bfs(i, &res, visited)
		}
	}

	return res
}

func (a *AdjList) bfs(v int, res *[]int, visited []bool) {
	queue := make([]int, 0)
	queue = append(queue, v)
	visited[v] = true
	for len(queue) > 0 {
		removed := queue[0]
		queue = queue[1:]

		*res = append(*res, removed)

		lst := a.adj[v]
		for element := lst.Front(); element != nil; element = element.Next() {
			if !visited[element.Value.(int)] {
				queue = append(queue, element.Value.(int))
				visited[element.Value.(int)] = true
			}
		}
	}
}

```

#### 5.2.1. 测试

```go
func TestAdjList(t *testing.T) {
	adjList := NewAdjList([]int{
		7, 9,
		0, 1,
		0, 3,
		1, 2,
		1, 6,
		2, 3,
		2, 5,
		3, 4,
		4, 5,
		5, 6})
	fmt.Println(adjList)
	fmt.Println(adjList.Dfs())
	fmt.Println(adjList.Bfs())


}
```

## 6. 参考
- [玩转图论算法（1）图的基本表示【Java实现】\_mike\_jun的博客\-CSDN博客](https://mikejun.blog.csdn.net/article/details/104149816)
- [玩转图论算法（2）图的深度优先遍历【Java实现】\_mike\_jun的博客\-CSDN博客](https://mikejun.blog.csdn.net/article/details/105725860)
- [玩转图论算法（5）图的广度优先遍历【Java实现】\_mike\_jun的博客\-CSDN博客](https://mikejun.blog.csdn.net/article/details/105918919)