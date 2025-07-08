## 1. 是什么

定长的数组

## 2. 使用
### 2.1. 数组的长度也是类型

```go
func TestArray(t *testing.T) {
	arrays := [3]int{1, 2, 3}
	arrays2 := [4]int{1, 2, 3}
	fmt.Println(reflect.DeepEqual(arrays,arrays2))
	//fmt.Println(arrays == arrays2)//Invalid operation: arrays == arrays2 (mismatched types [3]int and [4]int)

}

//输出
false
```

### 2.2. 数组是值传递
赋值和函数传参时候是复制一份新的数组

```go
func TestArray2(t *testing.T) {
	arrays := [...]int{1, 2, 3}
	testArray(arrays)
	fmt.Println(arrays)

	testArrayAddr(&arrays)
	fmt.Println(arrays)

}

//这里修改的会反映到调用方
func testArrayAddr(arrays *[3]int) {
	arrays[0] = 33333

}

//golang中的array是值传递,会复制一份完全一样的
//注意数组的长度也是属于类型的,即如果参数是[...]int会报错
func testArray(arrays [3]int) {
	arrays[0] = 2222
	fmt.Println(arrays)

}


//输出
[2222 2 3]
[1 2 3]
[33333 2 3]
```

### 2.3. 可以用range迭代

```go
func TestArray3(t *testing.T) {
	a := [...]int{999, 888, 777}

	for i := range a {
		fmt.Printf("a[%d]: %d\n", i, a[i])
	}
	fmt.Println("==========")
	for i, v := range a  {
		fmt.Printf("a[%d]: %d\n", i, v)
	}
	fmt.Println("==========")
	for i := 0; i < len(a ); i++ {
		fmt.Printf("a[%d]: %d\n", i, a [i])
	}
}

//输出
a[0]: 999
a[1]: 888
a[2]: 777
==========
a[0]: 999
a[1]: 888
a[2]: 777
==========
a[0]: 999
a[1]: 888
a[2]: 777

```

## 3. 原理

### 3.1. 数据结构

```go
type Array struct {
	Elem  *Type // 类型
	Bound int64 // 长度
}
```
### 3.2. 创建
#### 3.2.1. 初始化
- 第一种方式

```go
arr1 := [3]int{1, 2, 3}
```

会调用到[cmd/compile/internal/types.NewArray](https://github.com/golang/go/blob/616c39f6a636166447bdaac4f0871a5ca52bae8c/src/cmd/compile/internal/types/type.go#L473-L481)
```go
func NewArray(elem *Type, bound int64) *Type {
	if bound < 0 {
		Fatalf("NewArray: invalid bound %v", bound)
	}
	t := New(TARRAY)
	//Array包含两个字段Elem和Bound
	t.Extra = &Array{Elem: elem, Bound: bound}
	//当前数组是否应该在堆栈中初始化也在编译期就确定了
	t.SetNotInHeap(elem.NotInHeap())
	return t
}
```

- 第二种方式
```go
arr2 := [...]int{1, 2, 3}
```

一样会调用[cmd/compile/internal/types.NewArray](https://github.com/golang/go/blob/616c39f6a636166447bdaac4f0871a5ca52bae8c/src/cmd/compile/internal/types/type.go#L473-L481)，Bound为-1
后面调用到[cmd/compile/internal/gc.typecheckcomplit](https://github.com/golang/go/blob/b7d097a4cf6b8a9125e4770b54d33826fa803023/src/cmd/compile/internal/gc/typecheck.go#L2755-L2961)设置长度

```go
func typecheckcomplit(n *Node) (res *Node) {
	...

	switch t.Etype {
	case TARRAY, TSLICE:
		var length, i int64
		nl := n.List.Slice()
		for i2, l := range nl {
			i++
			if i > length {
				length = i
			}
		}
        
        //如果是... 那么重新设置长度
		if t.IsDDDArray() {
			t.SetNumElem(length)
		}
	}
}
```

#### 3.2.2. 字面量存储的位置


- [cmd/compile/internal/gc.anylit](https://github.com/golang/go/blob/f07059d949057f414dd0f8303f93ca727d716c62/src/cmd/compile/internal/gc/sinit.go#L875-L967)
```go
func anylit(n *Node, var_ *Node, init *Nodes) {
	t := n.Type
	switch n.Op {
	case OSTRUCTLIT, OARRAYLIT:
		if n.List.Len() > 4 {
			...
		}

		fixedlit(inInitFunction, initKindLocalCode, n, var_, init)
	...
	}
}
```

当元素数量小于或者等于 4 个时，会直接将数组中的元素放置在栈上
```go
func fixedlit(ctxt initContext, kind initKind, n *Node, var_ *Node, init *Nodes) {
	var splitnode func(*Node) (a *Node, value *Node)
	...

	for _, r := range n.List.Slice() {
		a, value := splitnode(r)
		a = nod(OAS, a, value)
		a = typecheck(a, ctxStmt)
		switch kind {
		case initKindStatic:
			genAsStatic(a)
		//走到下面，相当于
		//var arr [3]int
        //arr[0] = 1
        //arr[1] = 2
        //arr[2] = 3
		case initKindLocalCode:
			a = orderStmtInPlace(a, map[string][]*Node{})
			a = walkstmt(a)
			init.Append(a)
		}
	}
}
```
当元素数量大于 4 个时，会将数组中的元素放置到静态区并在运行时取出
```go
func anylit(n *Node, var_ *Node, init *Nodes) {
	t := n.Type
	switch n.Op {
	case OSTRUCTLIT, OARRAYLIT:
		if n.List.Len() > 4 {
			vstat := staticname(t)
			vstat.Name.SetReadonly(true)

            //相当于
            //var arr [5]int
            //statictmp_0[0] = 1
            //statictmp_0[1] = 2
            //statictmp_0[2] = 3
            //statictmp_0[3] = 4
            //statictmp_0[4] = 5
            //arr = statictmp_0
			fixedlit(inNonInitFunction, initKindStatic, n, vstat, init)

			a := nod(OAS, var_, vstat)
			a = typecheck(a, ctxStmt)
			a = walkexpr(a, init)
			init.Append(a)
			break
		}
		
		...
	}
}
```


### 3.3. 访问和赋值
#### 3.3.1. 下标检查
使用常量数组下标，会到达[cmd/compile/internal/gc.typecheck1](https://github.com/golang/go/blob/b7d097a4cf6b8a9125e4770b54d33826fa803023/src/cmd/compile/internal/gc/typecheck.go#L327-L2081)由编译时进行越界检查

```go
func typecheck1(n *Node, top int) (res *Node) {
	switch n.Op {
	case OINDEX:
		ok |= ctxExpr
		l := n.Left  // array
		r := n.Right // index
		switch n.Left.Type.Etype {
		case TSTRING, TARRAY, TSLICE:
			...
			//访问数组的索引是非整数时
			if n.Right.Type != nil && !n.Right.Type.IsInteger() {
				yyerror("non-integer array index %v", n.Right)
				break
			}
			//访问数组的索引是负数时
			if !n.Bounded() && Isconst(n.Right, CTINT) {
				x := n.Right.Int64()
				if x < 0 {
					yyerror("invalid array index %v (index must be non-negative)", n.Right)
				}
				//访问数组的索引越界时
				else if n.Left.Type.IsArray() && x >= n.Left.Type.NumElem() {
					yyerror("invalid array index %v (out of bounds for %d-element array)", n.Right, n.Left.Type.NumElem())
				}
			}
		}
	...
	}
}
```

如果使用的是变量数组下标，会到达[runtime.goPanicIndex](https://github.com/golang/go/blob/22d28a24c8b0d99f2ad6da5fe680fa3cfa216651/src/runtime/panic.go#L86-L89)由运行时下标检查


## 4. 参考
- [Go 语言数组的实现原理 \| Go 语言设计与实现](https://draveness.me/golang/docs/part2-foundation/ch03-datastructure/golang-array/)