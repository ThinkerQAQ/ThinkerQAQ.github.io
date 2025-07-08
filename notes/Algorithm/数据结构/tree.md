## 1. 二叉树是什么
每个节点最多有两个子节点
## 2. 二叉树操作
### 2.1. 遍历

#### 2.1.1. 先序遍历
先访问根节点，然后访问左子树，最后访问右子树
#### 2.1.2. 中序遍历
先访问左子树，然后访问根节点，最后访问右子树
#### 2.1.3. 后序遍历
先访问左子树，然后访问右子树，最后访问根节点

#### 2.1.4. 深度遍历
其实就是先序遍历+回退

#### 2.1.5. 广度遍历

使用队列，每访问一个节点就把左右节点都加入队列
### 2.2. 前驱和后继
#### 2.2.1. 前驱
- ![](https://raw.githubusercontent.com/TDoct/images/master/1613313322_20210214223429373_4471.png)
```go
//前驱节点：中序遍历的前一个节点，也是比当前小的节点中最大的那个
func predecessor(n *node) *node {
	if n == nil {
		return nil
	}

	//左子树不为空
	if n.left != nil {
		return max(n.left)
	}

	//左子树为空但是父节点不为空
	for n.parent != nil {
		if n.parent.right == n {
			return n.parent
		}
		n = n.parent
	}

	//左子树为空并且父节点也为空
	return nil
}
```

#### 2.2.2. 后继

- ![](https://raw.githubusercontent.com/TDoct/images/master/1613313324_20210214223510483_21688.png)

```go
//后继节点：中序遍历的后一个节点，也是比当前大的节点中最小的那个
func successor(n *node) *node {
	if n == nil {
		return nil
	}

	//右子树不为空
	if n.right != nil {
		return min(n.left)
	}

	//右子树为空但是父节点不为空
	for n.parent != nil {
		if n.parent.left == n {
			return n.parent
		}
		n = n.parent
	}

	//右子树为空并且父节点也为空
	return nil
}

```
## 3. 二叉树分类
### 3.1. 满二叉树
- ![](https://raw.githubusercontent.com/TDoct/images/master/1610537165_20210113192548928_7647.png)
### 3.2. 完全二叉树
- ![](https://raw.githubusercontent.com/TDoct/images/master/1610537166_20210113192601672_6685.png)
### 3.3. 二叉查找树【BST Tree】
左子树的所有节点 < 根节点 < 右子树的所有节点
跟[heap](heap.md)不同，堆是父节点的值>左和右节点
#### 3.3.1. 数据结构
- 二叉树节点
- 长度

#### 3.3.2. API

```go
type IBinarySearchTree interface {
	//打印二叉树
	String() string
	//二叉树长度
	Length() int
	//二叉树是否为空
	IsEmpty() bool
	//往二叉树添加一个元素
	Add(data model.Comparable)
	//二叉树是否包含元素
	Contains(data model.Comparable) bool
	//先序遍历
	PreOrder() []*node
	//中序遍历
	InOrder() []*node
	//后序遍历
	PostOrder() []*node
	//层序遍历
	LevelOrder() []*node
	//二叉树最大值
	Max() *node
	//二叉树最小值
	Min() *node
	//删除二叉树中的元素
	Remove(data model.Comparable)
	//删除二叉树中的最大元素
	RemoveMax() *node
	//删除二叉树中的最小元素
	RemoveMin() *node
}
```

#### 3.3.3. 实现

```go

type node struct {
	data  model.Comparable
	left  *node
	right *node
}

func (n *node) String() string {
	return fmt.Sprintf("%v", n.data)
}

func newNode(value model.Comparable) *node {
	return &node{
		data: value,
	}
}

type BinarySearchTree struct {
	root   *node
	length int
}

func NewBinarySearchTree() *BinarySearchTree {
	return &BinarySearchTree{}
}

func (b *BinarySearchTree) String() string {
	s := fmt.Sprintf("length=%v, data={", b.Length())
	if b.root == nil {
		s += "}"
		return s
	}

	line := make([]model.Comparable, 0)
	allLines := make([][]model.Comparable, 0)

	queue := list.New()
	queue.PushBack(b.root)
	currentLineLast := b.root
	var nextLineLast *node
	for queue.Len() > 0 {
		n := queue.Remove(queue.Front()).(*node)
		line = append(line, n.data)
		if n.left != nil {
			queue.PushBack(n.left)
			nextLineLast = n.left
		}
		if n.right != nil {
			queue.PushBack(n.right)
			nextLineLast = n.right
		}
		if n == currentLineLast {
			currentLineLast = nextLineLast
			allLines = append(allLines, line)
			line = make([]model.Comparable, 0)
		}

	}

	for _, l := range allLines {
		s += fmt.Sprintf("%v\n", l)
	}
	s += "}"

	return s
}

func (b *BinarySearchTree) Length() int {
	return b.length
}

func (b *BinarySearchTree) IsEmpty() bool {
	return b.root == nil
}

func (b *BinarySearchTree) Add(data model.Comparable) {
	b.root = add(b.root, data)
	b.length++
}

func add(n *node, data model.Comparable) *node {
	if n == nil {
		return newNode(data)
	}
	if data.CompareTo(n.data) <= 0 {
		//以下代码只是便于理解
		//if n.left == nil {
		//	n.left = newNode(data)
		//	return n
		//}
		n.left = add(n.left, data)
		return n
	} else {
		//if n.right == nil {
		//	n.right = newNode(data)
		//	return n
		//}
		n.right = add(n.right, data)
		return n
	}
}

func (b *BinarySearchTree) Contains(data model.Comparable) bool {
	return contains(b.root, data)
}

func contains(node *node, data model.Comparable) bool {
	if node == nil {
		return false
	}

	if data.CompareTo(node.data) < 0 {
		return contains(node.left, data)
	} else if data.CompareTo(node.data) > 0 {
		return contains(node.right, data)
	} else {
		return true
	}
}

func (b *BinarySearchTree) PostOrderNoRecur() []*node {
	res := make([]*node, 0)
	stack := make([]*node, 0)
	stack = append(stack, b.root)
	var prev *node
	for len(stack) > 0 {
		top := stack[len(stack)-1]
		if isLeaf(top) || hasVisitedChild(prev, top) {
			prev = top
			stack = stack[:len(stack)-1]
			res = append(res, top)
		} else {
			if top.right != nil {
				stack = append(stack, top.right)
			}
			if top.left != nil {
				stack = append(stack, top.left)
			}
		}
	}

	return res
}

func hasVisitedChild(child *node, parent *node) bool {
	return child != nil && (parent.right == child || parent.left == child)
}

func isLeaf(n *node) bool {
	return n.left == nil && n.right == nil
}

func (b *BinarySearchTree) PreOrderNoRecur() []*node {
	res := make([]*node, 0)
	stack := make([]*node, 0)
	stack = append(stack, b.root)
	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]

		res = append(res, current)
		if current.right != nil {
			stack = append(stack, current.right)
		}
		if current.left != nil {
			stack = append(stack, current.left)
		}
	}
	return res
}

func (b *BinarySearchTree) InOrderNoRecur() []*node {
	res := make([]*node, 0)
	stack := make([]*node, 0)
	current := b.root
	for {
		if current != nil {
			stack = append(stack, current)
			current = current.left
		} else if len(stack) == 0 {
			return res
		} else {
			current = stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			res = append(res, current)
			current = current.right
		}
	}
}


func (b *BinarySearchTree) PreOrder() []*node {
	datas := make([]*node, 0)
	preOrder(b.root, &datas)
	return datas
}

func preOrder(node *node, datas *[]*node) {
	if node == nil {
		return
	}
	*datas = append(*datas, node)
	preOrder(node.left, datas)
	preOrder(node.right, datas)
}

func (b *BinarySearchTree) InOrder() []*node {
	datas := make([]*node, 0)
	inOrder(b.root, &datas)
	return datas
}

func inOrder(node *node, datas *[]*node) {
	if node == nil {
		return
	}
	inOrder(node.left, datas)
	*datas = append(*datas, node)
	inOrder(node.right, datas)
}

func (b *BinarySearchTree) PostOrder() []*node {
	datas := make([]*node, 0)
	postOrder(b.root, &datas)
	return datas
}

func postOrder(node *node, datas *[]*node) {
	if node == nil {
		return
	}
	postOrder(node.left, datas)
	postOrder(node.right, datas)
	*datas = append(*datas, node)
}

func (b *BinarySearchTree) LevelOrder() []*node {
	datas := make([]*node, 0)
	levelOrder(b.root, &datas)
	return datas
}

func levelOrder(n *node, datas *[]*node) {
	if n == nil {
		return
	}
	queue := list.New()
	queue.PushBack(n)
	for queue.Len() > 0 {
		e := queue.Remove(queue.Front()).(*node)
		*datas = append(*datas, e)
		if e.left != nil {
			queue.PushBack(e.left)
		}
		if e.right != nil {
			queue.PushBack(e.right)
		}
	}
}

func (b *BinarySearchTree) Remove(data model.Comparable) {
	if b.root == nil {
		return
	}
	b.root = b.remove(b.root, data)
}

func (b *BinarySearchTree) remove(n *node, data model.Comparable) *node {
	//找到要删除的节点
	if data.CompareTo(n.data) < 0 {
		n.left = b.remove(n.left, data)
		return n
	} else if data.CompareTo(n.data) > 0 {
		n.right = b.remove(n.right, data)
		return n
	} else {
		//执行删除
		b.length--
		return doRemove(n)
	}
}

func doRemove(n *node) *node {
	//左子树为空
	//那么删除当前节点，把右子树上移为根节点
	//跟removeMin差不多
	if n.left == nil {
		rightNode := n.right
		n.right = nil
		return rightNode
	}
	//右子树为空
	//那么删除当前节点，把左子树上移为根节点
	//跟removeMax差不多
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

func (b *BinarySearchTree) Max() *node {
	if b.root == nil {
		return nil
	}
	return max(b.root)
}

func max(n *node) *node {
	if n.right == nil {
		return n
	}
	return max(n.right)
}

func (b *BinarySearchTree) Min() *node {
	if b.root == nil {
		return nil
	}
	return min(b.root)
}

func min(n *node) *node {
	if n.left == nil {
		return n
	}
	return min(n.left)
}

func (b *BinarySearchTree) RemoveMax() *node {
	e := b.Max()
	b.root = removeMax(b.root)
	b.length--
	return e
}

func removeMax(n *node) *node {
	if n == nil {
		return nil
	}
	//右子树为空，说明当前节点就是最大节点
	//那么删除当前节点，把左子树上移为根节点
	if n.right == nil {
		leftNode := n.left
		n.left = nil
		return leftNode
	}
	n.right = removeMax(n.right)
	return n
}

func (b *BinarySearchTree) RemoveMin() *node {
	e := b.Min()
	b.root = removeMin(b.root)
	b.length--
	return e
}

func removeMin(n *node) *node {
	if n == nil {
		return nil
	}
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

##### 3.3.3.1. 测试

```go
func TestBST(t *testing.T) {
	bst := NewBinarySearchTree()

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e3 := model.NewElement(3)
	e4 := model.NewElement(4)
	e5 := model.NewElement(5)

	bst.Add(e3)
	bst.Add(e2)
	bst.Add(e4)
	bst.Add(e1)
	bst.Add(e5)

	fmt.Println("初始数据：", bst)
	fmt.Println("层序遍历：", bst.LevelOrder())
	fmt.Println("前序遍历：", bst.PreOrder())
	fmt.Println("前序遍历非递归：", bst.PreOrderNoRecur())

	fmt.Println("中序遍历：", bst.InOrder())
	fmt.Println("中序遍历非递归：", bst.InOrderNoRecur())

	fmt.Println("后序遍历：", bst.PostOrder())
	fmt.Println("后序遍历非递归：", bst.PostOrderNoRecur())


	fmt.Println("最小节点：", bst.Min())
	fmt.Println("最大节点：", bst.Max())
	fmt.Println("删除最小节点：", bst.RemoveMin())
	fmt.Println("删除最小节点后：", bst)
	bst.Remove(e3)
	fmt.Println("删除根节点后：", bst)

}
```
### 3.4. 平衡二叉查找树【AVL Tree】
二叉查找树最差的情况会退化成链表，此时效率为O（N），因此引入了AVL树
AVL在BST的基础上加上了一个条件：平衡因子<=1。所谓平衡因子定义为左子树的高度和右子树的高度之间的差

-  举例

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200209223314.png)
如上图不是平衡树，节点左边的数字是高度，上面的数字是平衡因子，可以明显的看出平衡因子有>1的


#### 3.4.1. 数据结构
- 同二叉搜索树
#### 3.4.2. API
```go
type IAVLTree interface {
	//打印二叉树
	String() string
	//二叉树长度
	Length() int
	//二叉树是否为空
	IsEmpty() bool
	//往二叉树添加一个元素
	Add(data model.Comparable)
	//二叉树是否包含元素
	Contains(data model.Comparable) bool
	//先序遍历
	PreOrder() []*node
	//中序遍历
	InOrder() []*node
	//后序遍历
	PostOrder() []*node
	//层序遍历
	LevelOrder() []*node
	//二叉树最大值
	Max() *node
	//二叉树最小值
	Min() *node
	//删除二叉树中的元素
	Remove(data model.Comparable)
}
```
#### 3.4.3. 实现

```go

type node struct {
	data   model.Comparable
	left   *node
	right  *node
	height int
}

func (n *node) String() string {
	return fmt.Sprintf("%v", n.data)
}

func newNode(value model.Comparable) *node {
	return &node{
		data:   value,
		height: 1,
	}
}

type AVLTree struct {
	root   *node
	length int
}

func NewAVLTree() *AVLTree {
	return &AVLTree{}
}

func (a *AVLTree) String() string {
	s := fmt.Sprintf("length=%v, data={", a.Length())
	if a.root == nil {
		s += "}"
		return s
	}

	line := make([]model.Comparable, 0)
	allLines := make([][]model.Comparable, 0)

	queue := list.New()
	queue.PushBack(a.root)
	currentLineLast := a.root
	var nextLineLast *node
	for queue.Len() > 0 {
		n := queue.Remove(queue.Front()).(*node)
		line = append(line, n.data)
		if n.left != nil {
			queue.PushBack(n.left)
			nextLineLast = n.left
		}
		if n.right != nil {
			queue.PushBack(n.right)
			nextLineLast = n.right
		}
		if n == currentLineLast {
			currentLineLast = nextLineLast
			allLines = append(allLines, line)
			line = make([]model.Comparable, 0)
		}

	}

	for _, l := range allLines {
		s += fmt.Sprintf("%v\n", l)
	}
	s += "}"

	return s
}

func (a *AVLTree) Length() int {
	return a.length
}

func (a *AVLTree) IsEmpty() bool {
	return a.root == nil
}

//是否二叉搜索树
func IsBST(n *node) bool {
	datas := make([]*node, 0)
	inOrder(n, &datas)
	for i := 0; i < len(datas)-1; i++ {
		if datas[i].data.CompareTo(datas[i+1].data) > 0 {
			return false
		}
	}
	return true
}

//是否AVL树
func IsBalanced(n *node) bool {
	if n == nil {
		return true
	}
	return GetAbsBalanceFactor(n) <= 1 && IsBalanced(n.left) && IsBalanced(n.right)
}

//获取一个节点的高度
func GetHeight(n *node) int {
	if n == nil {
		return 0
	}
	//return n.height
	//或者
	return 1 + util.Max(GetHeight(n.left), GetHeight(n.right))
}

//获取左右子树高度之差
//如果左子树矮，那么返回负数
//如果右子树矮，那么正数
func GetBalanceFactor(n *node) int {
	if n == nil {
		return 0
	}
	return GetHeight(n.left) - GetHeight(n.right)
}

//获取左右子树高度之差，绝对值
func GetAbsBalanceFactor(n *node) int {
	return util.Abs(GetBalanceFactor(n))
}

func (a *AVLTree) Add(data model.Comparable) {
	a.root = add(a.root, data)
	a.length++
}

func add(n *node, data model.Comparable) *node {
	if n == nil {
		return newNode(data)
	}
	if data.CompareTo(n.data) <= 0 {
		//以下代码只是便于理解
		//if n.left == nil {
		//	n.left = newNode(data)
		//	return n
		//}
		n.left = add(n.left, data)
	} else {
		//if n.right == nil {
		//	n.right = newNode(data)
		//	return n
		//}
		n.right = add(n.right, data)
	}

	n.height = 1 + util.Max(GetHeight(n.left), GetHeight(n.right))

	balanceFactor := GetBalanceFactor(n)

	// 平衡维护
	// LL
	if balanceFactor > 1 && GetBalanceFactor(n.left) >= 0 {
		return rightRotate(n)
	}

	// RR
	if balanceFactor < -1 && GetBalanceFactor(n.right) <= 0 {
		return leftRotate(n)
	}

	// LR
	if balanceFactor > 1 && GetBalanceFactor(n.left) < 0 {
		return leftRotate(n)
	}

	// RL
	if balanceFactor < -1 && GetBalanceFactor(n.right) > 0 {
		return leftRotate(n)
	}

	return n
}

// 对节点y进行向左旋转操作，返回旋转后新的根节点x
//    y                             x
//  /  \                          /   \
// T1   x      向左旋转 (y)       y     z
//     / \   - - - - - - - ->   / \   / \
//   T2  z                     T1 T2 T3 T4
//      / \
func leftRotate(y *node) *node {
	x := y.right
	T2 := x.left

	//向左旋转过程
	x.left = y
	y.right = T2

	//更新height
	y.height = util.Max(GetHeight(y.left), GetHeight(y.right)) + 1
	x.height = util.Max(GetHeight(x.left), GetHeight(x.right)) + 1
	return x
}

// 对节点y进行向右旋转操作，返回旋转后新的根节点x
//        y                              x
//       / \                           /   \
//      x   T4     向右旋转 (y)        z     y
//     / \       - - - - - - - ->    / \   / \
//    z   T3                       T1  T2 T3 T4
//   / \
func rightRotate(y *node) *node {
	x := y.left
	T3 := x.right

	//向右旋转过程
	x.right = y
	y.left = T3

	//更新height
	y.height = util.Max(GetHeight(y.left), GetHeight(y.right)) + 1
	x.height = util.Max(GetHeight(x.left), GetHeight(x.right)) + 1

	return x

}

func (a *AVLTree) Contains(data model.Comparable) bool {
	return contains(a.root, data)
}

func contains(node *node, data model.Comparable) bool {
	if node == nil {
		return false
	}

	if data.CompareTo(node.data) < 0 {
		return contains(node.left, data)
	} else if data.CompareTo(node.data) > 0 {
		return contains(node.right, data)
	} else {
		return true
	}
}

func (a *AVLTree) PreOrder() []*node {
	datas := make([]*node, 0)
	preOrder(a.root, &datas)
	return datas
}

func preOrder(node *node, datas *[]*node) {
	if node == nil {
		return
	}
	*datas = append(*datas, node)
	preOrder(node.left, datas)
	preOrder(node.right, datas)
}

func (a *AVLTree) InOrder() []*node {
	datas := make([]*node, 0)
	inOrder(a.root, &datas)
	return datas
}

func inOrder(node *node, datas *[]*node) {
	if node == nil {
		return
	}
	inOrder(node.left, datas)
	*datas = append(*datas, node)
	inOrder(node.right, datas)
}

func (a *AVLTree) PostOrder() []*node {
	datas := make([]*node, 0)
	postOrder(a.root, &datas)
	return datas
}

func postOrder(node *node, datas *[]*node) {
	if node == nil {
		return
	}
	postOrder(node.left, datas)
	postOrder(node.right, datas)
	*datas = append(*datas, node)
}

func (a *AVLTree) LevelOrder() []*node {
	datas := make([]*node, 0)
	levelOrder(a.root, &datas)
	return datas
}

func levelOrder(n *node, datas *[]*node) {
	if n == nil {
		return
	}
	queue := list.New()
	queue.PushBack(n)
	for queue.Len() > 0 {
		e := queue.Remove(queue.Front()).(*node)
		*datas = append(*datas, e)
		if e.left != nil {
			queue.PushBack(e.left)
		}
		if e.right != nil {
			queue.PushBack(e.right)
		}
	}
}

func (a *AVLTree) Remove(data model.Comparable) {
	if a.root == nil {
		return
	}
	a.root = a.remove(a.root, data)
}

func (a *AVLTree) remove(n *node, data model.Comparable) *node {
	var retNode *node
	//找到要删除的节点
	if data.CompareTo(n.data) < 0 {
		n.left = a.remove(n.left, data)
		retNode = n
	} else if data.CompareTo(n.data) > 0 {
		n.right = a.remove(n.right, data)
		retNode = n
	} else {
		//执行删除
		a.length--
		retNode = a.doRemove(n)
	}

	if retNode == nil {
		return nil
	}

	retNode.height = 1 + util.Max(GetHeight(retNode.left), GetHeight(retNode.right))

	balanceFactor := GetBalanceFactor(retNode)

	// 平衡维护
	// LL
	if balanceFactor > 1 && GetBalanceFactor(retNode.left) >= 0 {
		return rightRotate(retNode)
	}

	// RR
	if balanceFactor < -1 && GetBalanceFactor(retNode.right) <= 0 {
		return leftRotate(retNode)
	}

	// LR
	if balanceFactor > 1 && GetBalanceFactor(retNode.left) < 0 {
		return leftRotate(retNode)
	}

	// RL
	if balanceFactor < -1 && GetBalanceFactor(retNode.right) > 0 {
		return leftRotate(retNode)
	}

	return retNode

}

func (a *AVLTree) doRemove(n *node) *node {
	//左子树为空
	//那么删除当前节点，把右子树上移为根节点
	//跟removeMin差不多
	if n.left == nil {
		rightNode := n.right
		n.right = nil
		return rightNode
	}
	//右子树为空
	//那么删除当前节点，把左子树上移为根节点
	//跟removeMax差不多
	if n.right == nil {
		leftNode := n.left
		n.left = nil
		return leftNode
	}

	//左右子树都不为空
	//先找到当前节点的前继，即右子树的最小节点代替本节点
	successor := min(n.right)
	//successor.right = removeMin(n.right)
	successor.right = a.remove(n.right, successor.data)
	successor.left = n.left
	//删除当前节点
	n.left = nil
	n.right = nil
	return successor
}

func (a *AVLTree) Max() *node {
	if a.root == nil {
		return nil
	}
	return max(a.root)
}

func max(n *node) *node {
	if n.right == nil {
		return n
	}
	return max(n.right)
}

func (a *AVLTree) Min() *node {
	if a.root == nil {
		return nil
	}
	return min(a.root)
}

func min(n *node) *node {
	if n.left == nil {
		return n
	}
	return min(n.left)
}
```

##### 3.4.3.1. 测试

```go
func TestAVLBST(t *testing.T) {
	bst := NewAVLTree()

	e1 := model.NewElement(1)
	e2 := model.NewElement(2)
	e3 := model.NewElement(3)
	e4 := model.NewElement(4)
	e5 := model.NewElement(5)

	bst.Add(e3)
	bst.Add(e2)
	bst.Add(e4)
	bst.Add(e1)
	bst.Add(e5)

	fmt.Println("初始数据：", bst)
	fmt.Println("是否二叉搜索树：", IsBST(bst.root))
	fmt.Println("是否AVL树：", IsBalanced(bst.root))
	fmt.Println("层序遍历：", bst.LevelOrder())
	fmt.Println("前序遍历：", bst.PreOrder())
	fmt.Println("中序遍历：", bst.InOrder())
	fmt.Println("后序遍历：", bst.PostOrder())

	fmt.Println("最小节点：", bst.Min())
	fmt.Println("最大节点：", bst.Max())
	bst.Remove(e3)
	fmt.Println("删除根节点后：", bst)
	fmt.Println("是否AVL树：", IsBalanced(bst.root))

}
```

### 3.5. 红黑树【RB Tree】
[红黑树.md](红黑树.md)

## 4. 字典树/前缀树【Trie Tree】
[实现Trie前缀树.md](../leetcode/树/Trie树/实现Trie前缀树.md)
### 4.1. 数据结构
- map
### 4.2. API

```go
type ITrie interface {
	//打印trie树
	String() string
	//trie树长度
	Length() int
	//trie树是否为空
	IsEmpty() bool
	//往trie树添加一个单词
	Add(word string)
	//trie树是否包含单词 时间复杂度为 O(m)，m 为最长的字符串的长度
	Contains(word string) bool
	//trie树是否包含前缀
	IsPrefix(word string) bool
}

```
### 4.3. 实现
```go

type node struct {
	isWord bool
	next   map[rune]*node
}

func newNode(isWord bool) *node {
	return &node{isWord: isWord, next: make(map[rune]*node)}
}

type Trie struct {
	root   *node
	length int
}

func NewTrie() *Trie {
	return &Trie{
		root:   newNode(false),
		length: 0,
	}
}

func (t *Trie) String() string {
	panic("implement me")
}

func (t *Trie) Length() int {
	return t.length
}

func (t *Trie) IsEmpty() bool {
	return t.length == 0
}

func (t *Trie) Add(word string) {
	current := t.root
	runes := []rune(word)
	for i := 0; i < len(runes); i++ {
		ch := runes[i]
		_, ok := current.next[ch]
		if !ok {
			current.next[ch] = newNode(false)
		}
		current = current.next[ch]
	}

	if !current.isWord {
		current.isWord = true
		t.length++
	}
}

func (t *Trie) Contains(word string) bool {
	current := t.root
	runes := []rune(word)
	for i := 0; i < len(runes); i++ {
		ch := runes[i]
		next, ok := current.next[ch]
		if !ok {
			return false
		}
		current = next
	}

	return current.isWord
}

func (t *Trie) IsPrefix(word string) bool {
	current := t.root
	runes := []rune(word)
	for i := 0; i < len(runes); i++ {
		ch := runes[i]
		next, ok := current.next[ch]
		if !ok {
			return false
		}
		current = next
	}

	return true
}

```
#### 4.3.1. 测试

```go
func TestTrie(t *testing.T) {
	trie := NewTrie()
	trie.Add("panda")
	fmt.Println("是否包含panda：", trie.Contains("panda"))
	fmt.Println("是否包含pan：", trie.Contains("pan"))
	fmt.Println("是否有pan前缀：", trie.IsPrefix("pan"))
	trie.Add("pan")
	fmt.Println("是否包含pan：", trie.Contains("pan"))
}

```


## 5. 哈夫曼树
### 5.1. 是什么
- 可以实现哈夫曼编码：现代压缩算法的基础
### 5.2. 哈夫曼编码过程
以`ABBBCCCCCCCCDDDDDDEE`为例
1.  先计算出每个字母的出现频率

|  A  |  B  |  C  |  D  |  E  |
| --- | --- | --- | --- | --- |
| 1   | 3   | 8   | 6   | 2   |
2. 构造哈夫曼树
![](https://raw.githubusercontent.com/TDoct/images/master/1613706650_20210219114652425_20674.png)
3. 构造哈夫曼编码
    - left为0，right为1，那么构造的哈夫曼编码如下

    |  A   |  B  |  C  |  D  |  E   |
    | ---- | --- | --- | --- | ---- |
    | 1110 | 110 | 0   | 10  | 1111 |
    - `ABBBCCCCCCCCDDDDDDEE`编码的结果如下：`1110110110110000000001010101010101111`
## 6. 参考
- [二叉树遍历（前序、中序、后序、层次遍历、深度优先、广度优先）\_My\_Jobs的专栏\-CSDN博客](https://blog.csdn.net/My_Jobs/article/details/43451187)
- [树的深度遍历和先序遍历是一回事吗？广度遍历呢？\_百度知道](https://zhidao.baidu.com/question/71455267.html)
- [字典树 \- sangmado \- 博客园](https://www.cnblogs.com/gaochundong/p/trie_tree.html#:~:text=Trie%20%E7%9A%84%E5%AD%97%E7%AC%A6%E4%B8%B2%E6%90%9C%E7%B4%A2,%E6%8F%92%E5%85%A5%E3%80%81%E5%AD%97%E7%AC%A6%E4%B8%B2%E6%90%9C%E7%B4%A2%E7%AD%89%E3%80%82)