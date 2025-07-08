## 1. 有哪些
### 1.1. 空接口interface{}
可以接收任意类型的数据
它只要记录这个数据在哪儿，是什么类型的就足够了

#### 1.1.1. 举例
```go
var e interface{}
```

底层结构如下

```go
type eface struct {
    _type *_type//指向接口的动态类型元数据
    data  unsafe.Pointer//指向接口的动态值
}
```
- ![](https://raw.githubusercontent.com/TDoct/images/master/1619017101_20210421225724973_877.png)
赋值
```go
f, _ := os.Open("eggo.txt")
e = f
```
- ![](https://raw.githubusercontent.com/TDoct/images/master/1619017026_20210421225620129_28123.png)
### 1.2. 非空接口
非空接口就是有方法列表的接口类型
一个变量要想赋值给一个非空接口类型，其类型必须要实现该接口要求的所有方法才行
#### 1.2.1. 举例
```go
var rw io.ReadWriter
```

底层结构如下
![](https://raw.githubusercontent.com/TDoct/images/master/1619102927_20210422224745911_1125.png)
```go

type iface struct {
    tab   *itab//接口类型元数据+动态类型元数据
    data  unsafe.Pointer//接口的动态值
}


type itab struct {
    inter  *interfacetype//接口类型元数据
    _type  *_type//动态类型元数据
    hash   uint32
    _      [4]byte
    fun    [1]uintptr 
}


type interfacetype struct {
    typ      _type
    pkgpath  name
    mhdr     []imethod
}   
```

赋值

```go
f, _ := os.Open("eggo.txt")
rw = f
```

- ![](https://raw.githubusercontent.com/TDoct/images/master/1619102928_20210422224809494_16031.png)
在声明一个变量并且赋值
```go
var w io.Writer = f
```
- ![](https://raw.githubusercontent.com/TDoct/images/master/1619018052_20210421230711730_6480.png)

- 总结
    - 通过<接口类型, 动态类型>可以找到唯一的itab结构体
    - 因此golang把<接口类型, 动态类型>作为key，itab结构体作为value缓存在hash表中复用
## 2. interface是什么
一组方法的签名

## 3. 为什么需要interface
解耦上下游。上游只需要知道下游的接口即可，不需要知道下游具体的实现细节





## 4. 如何使用


### 4.1. 实现接口
go不需要显式实现接口，他用的是鸭子类型
#### 4.1.1. 鸭子类型
如果某个东西长得像鸭子，像鸭子一样游泳，像鸭子一样嘎嘎叫，那它就可以被看成是一只鸭子。
换句话说只要实现了A的接口那么就可以认为是个A。
他更关注的是对象如何被使用而不是对象的类型本身


```go
type People interface {
	Run()
}

type Student struct {
}

func (s *Student) Run() {
	fmt.Println("running...")
}

func TestInterface1(t *testing.T) {
	var p People = &Student{}
	p.Run()
}

//输出
running...
```

### 4.2. 多态
多态是一种运行期的行为，它可以使得一种类型具有多种类型的能力

- 接口

```go
//接口
type Phone interface {
	Call()
}

//多态的函数
func Call(phone Phone) {
	phone.Call()
}
```


- 实现类

```go
//实现类1
type Nokia struct {
	//Phone//写不写明实现的接口都行
}

func (n *Nokia) Call() {
	fmt.Println("I am Nokia.")
}

//实现类2
type Redmi struct {

}

func (r Redmi) Call() {
	fmt.Println("I am Redmi.")
}

```

- 测试

```go
func TestNokia_Call(t *testing.T) {
	Call(&Nokia{})
	Call(&Redmi{})
}
```


### 4.3. 继承
通过在结构体中嵌入匿名类型成员，可以继承匿名类型的属性和方法

#### 4.3.1. 继承属性

```go
type Point struct{ X, Y float64 }

type ColoredPoint struct {
	Point //继承匿名结构体
}

func TestInterface1(t *testing.T) {
	var cp ColoredPoint
	cp.X = 1
	cp.Point.Y = 2
	fmt.Println(cp.Point.X) // "1"
	fmt.Println(cp.Y)       // "2"
}
//输出
1
2
```
#### 4.3.2. 继承方法

```go
type Cache struct {
	m map[string]string
	sync.Mutex
}

func (c *Cache) Lookup(key string) string {
	c.Lock()         //编译器自动展开p.Mutex.Lock()
	defer c.Unlock() //编译器自动展开p.Mutex.Unlock()

	return c.m[key]
}

func TestInterface2(t *testing.T) {
	c := &Cache{}
	value := c.Lookup("test")
	fmt.Println(value)
}
```


### 4.4. 接口转换


#### 4.4.1. 类型转换

> <结果类型> := <目标类型> (<表达式>)


```go
type MyInt int

func TestType1(t *testing.T) {
	var a MyInt = 1
	var b int = 1
	//fmt.Println(a == b)//类型不同，不同比较
	fmt.Println(a == MyInt(b))
}

//输出
true
```

#### 4.4.2. 类型断言
|  A.(B)  |      空接口      |      非空接口      |               判断               |
| ------- | ---------------- | ------------------ | -------------------------------- |
| 具体类型 | 空接口.(具体类型) | 非空接口.(具体类型) | A的动态类型是否为B                |
| 非空接口 | 空接口.(非空接口) | 非空接口.(非空接口) | A的动态类型是否实现了B的动态类型的方法 |

##### 4.4.2.1. 空接口.(具体类型)
- 断言成功

```go
var e interface{}
f,_ := os.Open("eggo.txt")
e = f
r,ok := e.(*os.File)
```

- 断言失败

```go
var e interface{}
f := "eggo"
e = f
r,ok := e.(*os.File)
```
##### 4.4.2.2. 非空接口.(具体类型)
看iface.tab是否等于<接口类型, 动态类型>对应的itab

- 断言成功
```go
var rw io.ReadWriter
f,_ := os.Open("eggo.txt)
rw = f
r,ok := rw.(*os.File)
```
##### 4.4.2.3. 空接口.(非空接口)
- 断言成功
```go
var e interface{}
f,_ := os.Open("eggo.txt")
e = f
rw,ok := e.(io.ReadWriter)
```
##### 4.4.2.4. 非空接口.(非空接口)
- 断言成功

```go

var w io.Writer
f,_ := os.Open("eggo.txt")
w = f
rw,ok := w.(io.ReadWriter)
```

> 安全类型断言：<目标类型的值>，<布尔参数> := <表达式>.( 目标类型 )   
> 非安全类型断言：<目标类型的值> := <表达式>.( 目标类型 )


```go
func TestType2(t *testing.T) {
	var a interface{}
	var b int = 1

	a = b

	c := a.(int)//类型断言

	fmt.Println(c)

}
//输出
1
```
##### 4.4.2.5. 静态类型、动态类型和动态值
```go
func TestInterface3(t *testing.T) {
	var reader io.Reader //reader的静态类型为io.Reader，动态类型为nil，动态值为nil
	file, err := os.OpenFile("test", os.O_RDWR, 0)
	if err != nil {
		panic(err)
	}
	reader = file //reader的静态类型为io.Reader，动态类型为*os.File，动态值为file

	writer := reader.(io.Writer) //由于file实现了io.Writer接口，所以这里可以断言成Writer
	//writer静态类型为io.Writer，动态类型为*os.File，动态值为file

	var empty interface{}
	empty = writer //不需要断言，因为所有接口都实现了空接口
	fmt.Println(reader, file, writer, empty)
}

//输出
&{0xc000074a00} &{0xc000074a00} &{0xc000074a00} &{0xc000074a00}
```
#### 4.4.3. 类型转换 vs 类型断言
|        |         类型转换          |         类型断言          |
| ------ | ------------------------ | ------------------------ |
| 相同点 | 把一个类型转换成另一个类型 | 把一个类型转换成另一个类型 |
| 不同点 | 操作普通变量 | 操作接口变量 |

## 5. 原理


### 5.1. iface和eface
|     |   iface   |       eface       |
| --- | --------- | ----------------- |
| 相同点    | 都用于描述接口   | 都用于描述接口    |
|  不同点  | 接口带方法 | 空接口interface{} |

#### 5.1.1. iface

```go
type iface struct {
    tab  *itab//指向itab。主要有接口的类型和实体的类型
    data unsafe.Pointer//指向具体的值
}

type itab struct {
    inter  *interfacetype//描述了接口的类型
    _type  *_type//描述了实体的类型。包括内存对齐方式，大小等
    link   *itab
    hash   uint32 // copy of _type.hash. Used for type switches.
    bad    bool   // type does not implement interface
    inhash bool   // has this itab been added to hash?
    unused [2]byte
    fun    [1]uintptr // 和接口方法对应的具体数据类型的方法地址，实现接口调用方法的动态分派
}


type interfacetype struct {
    typ     _type//描述 Go 语言中各种数据类型的结构体
    pkgpath name//定义了接口的包名
    mhdr    []imethod//接口所定义的函数列表
}


type _type struct {
    // 类型大小
    size       uintptr
    ptrdata    uintptr
    // 类型的 hash 值
    hash       uint32
    // 类型的 flag，和反射相关
    tflag      tflag
    // 内存对齐相关
    align      uint8
    fieldalign uint8
    // 类型的编号，有bool, slice, struct 等等等等
    kind       uint8
    alg        *typeAlg
    // gc 相关
    gcdata    *byte
    str       nameOff
    ptrToThis typeOff
}


//各种数据类型都是在 _type 字段的基础上，增加一些额外的字段来进行管理的

type arraytype struct {
    typ   _type
    elem  *_type
    slice *_type
    len   uintptr
}

type chantype struct {
    typ  _type
    elem *_type
    dir  uintptr
}

type slicetype struct {
    typ  _type
    elem *_type
}

type structtype struct {
    typ     _type
    pkgPath name
    fields  []structfield
}
```
![](https://raw.githubusercontent.com/TDoct/images/master/1597569077_20200816165705065_25819.png)


#### 5.1.2. eface
```go
type eface struct {
    _type *_type//描述了实体的类型。包括内存对齐方式，大小等
    data  unsafe.Pointer//指向具体的值
}
```
![](https://raw.githubusercontent.com/TDoct/images/master/1597569080_20200816165811328_19753.png)


### 5.2. interface和nil比较
首先`interface`的值为`tab`（指向类型信息）+`data` （指向具体的数据）
然后`interface`的零值则是`tab`和`data`都为`nil`
最后`interface`的零值和`nil`是相等的
```go
type Coder interface {
	code()
}

type Gopher struct {
	name string
}

func (g Gopher) code() {
	fmt.Printf("%s is coding\n", g.name)
}


func getGopher() Coder {
	var g *Gopher
	fmt.Printf("g==nil: %v, Type: %T, Data: %v\n", g == nil, g, g)
	return g
}

func TestInterface1(t *testing.T) {
	var c Coder
	fmt.Printf("c==nil: %v, Type: %T, Data: %v\n", c == nil, c, c)

	c = getGopher()

	fmt.Printf("c==nil: %v, Type: %T, Data: %v\n", c == nil, c, c)

}


//输出
c==nil: true, Type: <nil>, Data: <nil>
g==nil: true, Type: *interface1.Gopher, Data: <nil>
c==nil: false, Type: *interface1.Gopher, Data: <nil>
```

### 5.3. 判断类型是否实现接口的原理
itab由接口类型和实体类型构成。

Go会使用类型的方法集接和口所需要的方法集进行匹配，如果类型的方法集完全包含接口的方法集，则可认为该类型实现了该接口。

例如某类型有 m 个方法，某接口有 n 个方法，则很容易知道这种判定的时间复杂度为 O(mn)，Go 会对方法集的函数按照函数名的字典序进行排序，所以实际的时间复杂度为 O(m+n)。
### 5.4. 接口转换的原理

```go
//inter 表示接口类型，i 表示绑定了实体类型的接口，r 则表示接口转换了之后的新的 iface
func convI2I(inter *interfacetype, i iface) (r iface) {
    tab := i.tab
    if tab == nil {
        return
    }
    if tab.inter == inter {
        r.tab = tab
        r.data = i.data
        return
    }
    r.tab = getitab(inter, tab._type, false)
    r.data = i.data
    return
}

func getitab(inter *interfacetype, typ *_type, canfail bool) *itab {
    // ……

    // 根据 inter, typ 计算出 hash 值
    h := itabhash(inter, typ)

    // look twice - once without lock, once with.
    // common case will be no lock contention.
    var m *itab
    var locked int
    for locked = 0; locked < 2; locked++ {
        if locked != 0 {
            lock(&ifaceLock)
        }

        // 遍历哈希表的一个 slot
        for m = (*itab)(atomic.Loadp(unsafe.Pointer(&hash[h]))); m != nil; m = m.link {

            // 如果在 hash 表中已经找到了 itab（inter 和 typ 指针都相同）
            if m.inter == inter && m._type == typ {
                // ……

                if locked != 0 {
                    unlock(&ifaceLock)
                }
                return m
            }
        }
    }

    // 在 hash 表中没有找到 itab，那么新生成一个 itab
    m = (*itab)(persistentalloc(unsafe.Sizeof(itab{})+uintptr(len(inter.mhdr)-1)*sys.PtrSize, 0, &memstats.other_sys))
    m.inter = inter
    m._type = typ

    // 添加到全局的 hash 表中
    additab(m, true, canfail)
    unlock(&ifaceLock)
    if m.bad {
        return nil
    }
    return m
}
```

## 6. 参考
- [深度解密Go语言之关于 interface 的 10 个问题](https://mp.weixin.qq.com/s/EbxkBokYBajkCR-MazL0ZA)