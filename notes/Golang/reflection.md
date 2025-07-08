## 1. 反射是什么
修改代码->编译->运行
正常来说我们要修改代码只能在编译前，反射能让我们在运行时修改代码

## 2. Golang如何实现反射
interface
当向interface变量赋予一个实体类型的时候，interface会存储实体的类型信息，反射就是通过interface的类型信息实现的
[interface.md](interface.md)


## 3. Type和Value

### 3.1. reflect包定义了`（Type，Value）`Pair

![](https://raw.githubusercontent.com/TDoct/images/master/1598078935_20200822134945409_10214.png)

### 3.2. 通过`reflect.TypeOf`获取Type
和`_type` （动态类型）关联比较紧密

```go
type emptyInterface struct {
	typ  *rtype//动态类型
	word unsafe.Pointer
}

func TypeOf(i interface{}) Type {
    //emptyInterface可以看作eface。eface在runtime包，而emptyInterface在reflect包
	eface := *(*emptyInterface)(unsafe.Pointer(&i))
	//传入动态类型
	return toType(eface.typ)
}

//没做什么，就是返回动态类型
func toType(t *rtype) Type {
	if t == nil {
		return nil
	}
	return t


type Type interface {
    // 所有的类型都可以调用下面这些函数

	// 此类型的变量对齐后所占用的字节数
	Align() int
	
	// 如果是 struct 的字段，对齐后占用的字节数
	FieldAlign() int

	// 返回类型方法集里的第 `i` (传入的参数)个方法
	Method(int) Method

	// 通过名称获取方法
	MethodByName(string) (Method, bool)

	// 获取类型方法集里导出的方法个数
	NumMethod() int

	// 类型名称
	Name() string

	// 返回类型所在的路径，如：encoding/base64
	PkgPath() string

	// 返回类型的大小，和 unsafe.Sizeof 功能类似
	Size() uintptr

	// 返回类型的字符串表示形式
	String() string

	// 返回类型的类型值
	Kind() Kind

	// 类型是否实现了接口 u
	Implements(u Type) bool

	// 是否可以赋值给 u
	AssignableTo(u Type) bool

	// 是否可以类型转换成 u
	ConvertibleTo(u Type) bool

	// 类型是否可以比较
	Comparable() bool

	// 下面这些函数只有特定类型可以调用
	// 如：Key, Elem 两个方法就只能是 Map 类型才能调用
	
	// 类型所占据的位数
	Bits() int

	// 返回通道的方向，只能是 chan 类型调用
	ChanDir() ChanDir

	// 返回类型是否是可变参数，只能是 func 类型调用
	// 比如 t 是类型 func(x int, y ... float64)
	// 那么 t.IsVariadic() == true
	IsVariadic() bool

	// 返回内部子元素类型，只能由类型 Array, Chan, Map, Ptr, or Slice 调用
	Elem() Type

	// 返回结构体类型的第 i 个字段，只能是结构体类型调用
	// 如果 i 超过了总字段数，就会 panic
	Field(i int) StructField

	// 返回嵌套的结构体的字段
	FieldByIndex(index []int) StructField

	// 通过字段名称获取字段
	FieldByName(name string) (StructField, bool)

	// FieldByNameFunc returns the struct field with a name
	// 返回名称符合 func 函数的字段
	FieldByNameFunc(match func(string) bool) (StructField, bool)

	// 获取函数类型的第 i 个参数的类型
	In(i int) Type

	// 返回 map 的 key 类型，只能由类型 map 调用
	Key() Type

	// 返回 Array 的长度，只能由类型 Array 调用
	Len() int

	// 返回类型字段的数量，只能由类型 Struct 调用
	NumField() int

	// 返回函数类型的输入参数个数
	NumIn() int

	// 返回函数类型的返回值个数
	NumOut() int

	// 返回函数类型的第 i 个值的类型
	Out(i int) Type

    // 返回类型结构体的相同部分
	common() *rtype
	
	// 返回类型结构体的不同部分
	uncommon() *uncommonType
}}
```

### 3.3. 通过`reflect.ValueOf`获取Value
结合` _type` （动态类型）和 `data `（动态值）两者


```go
func ValueOf(i interface{}) Value {
	if i == nil {
		return Value{}
	}
	
   // ……
	return unpackEface(i)
}

// 分解 eface
func unpackEface(i interface{}) Value {
    //将 i 转换成 *emptyInterface 类型
	e := (*emptyInterface)(unsafe.Pointer(&i))

	t := e.typ
	if t == nil {
		return Value{}
	}
	
	//将它的 typ 字段和 word 字段以及一个标志位字段组装成一个 Value 结构体
	f := flag(t.Kind())
	if ifaceIndir(t) {
		f |= flagIndir
	}
	return Value{t, e.word, f}
}

//Value结构体

// 设置切片的 len 字段，如果类型不是切片，就会panic
 func (v Value) SetLen(n int)
 
 // 设置切片的 cap 字段
 func (v Value) SetCap(n int)
 
 // 设置字典的 kv
 func (v Value) SetMapIndex(key, val Value)

 // 返回切片、字符串、数组的索引 i 处的值
 func (v Value) Index(i int) Value
 
 // 根据名称获取结构体的内部字段值
 func (v Value) FieldByName(name string) Value
 
// 用来获取 int 类型的值
func (v Value) Int() int64

// 用来获取结构体字段（成员）数量
func (v Value) NumField() int

// 尝试向通道发送数据（不会阻塞）
func (v Value) TrySend(x reflect.Value) bool

// 通过参数列表 in 调用 v 值所代表的函数（或方法
func (v Value) Call(in []Value) (r []Value) 

// 调用变参长度可变的函数
func (v Value) CallSlice(in []Value) []Value
```

### 3.4. 通过`Value.Kind`获取的是内置类型

```go
type Student struct {
}

//TypeOf返回的是Student
//Kind返回的是struct
```

### 3.5. 通过`Value.Interface()`获取interface{}

```go
func testStrType(v interface{}) {
	if str, ok := v.(string); ok {
		fmt.Println(str)
	}
}

func testType(t interface{}) {
	switch t.(type) {
	case int:
		fmt.Println("int类型")
	case *factory.Stu:
		fmt.Println("Stu类型")
		stu := t.(*factory.Stu)
		//stu := *factory.Stu(t)
		stu.TestPrintName()
	case factory.Learner:
		fmt.Println("Learner类型")
		learner := t.(factory.Learner)
		learner.Learn()
	}
}
```

### 3.6. 通过`Value.Elem`修改属性值
反射可以用来修改一个变量的值，前提是这个值可以被修改。


## 4. API
[go \- Why is IsValid\(\) returning true for the zero value of an int? \- Stack Overflow](https://stackoverflow.com/questions/50891989/why-is-isvalid-returning-true-for-the-zero-value-of-an-int)
## 5. 参考
- [reflection \- How do you create a new instance of a struct from its type at run time in Go? \- Stack Overflow](https://stackoverflow.com/questions/7850140/how-do-you-create-a-new-instance-of-a-struct-from-its-type-at-run-time-in-go)
- [go \- cannot convert data \(type interface \{\}\) to type string: need type assertion \- Stack Overflow](https://stackoverflow.com/questions/14289256/cannot-convert-data-type-interface-to-type-string-need-type-assertion)
- [The Laws of Reflection \- The Go Blog](https://blog.golang.org/laws-of-reflection)
- [一看就懂系列之Golang的反射\_golang\_咖啡色的羊驼\-CSDN博客](https://blog.csdn.net/u011957758/article/details/81193806)
- [深度解密Go语言之反射 \| qcrao](https://qcrao.com/2019/05/07/dive-into-go-reflection/#%E4%BB%80%E4%B9%88%E6%98%AF%E5%8F%8D%E5%B0%84)