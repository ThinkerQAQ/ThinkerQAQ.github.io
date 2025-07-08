## 1. sync.map是什么
- 线程安全的Map
- 底层使用乐观锁实现，所以适用竞争不大的场景
    - 一次写多次读，如缓存的场景
    - 多个goroutine读写的是没有交集的key

### 1.1. 并发安全的思路

- 加一把大锁
- 把map分成若干map，只操作小map

## 2. 使用

```go
func main() {
	var m sync.Map
	// 1. 写入
	m.Store("zsk", 18)
	m.Store("wsy", 20)

	// 2. 读取
	age, _ := m.Load("zsk")
	fmt.Println(age.(int))

	// 3. 遍历
	m.Range(func(key, value interface{}) bool {
		name := key.(string)
		age := value.(int)
		fmt.Println(name, age)
		return true
	})

	// 4. 删除
	m.Delete("zsk")
	age, ok := m.Load("zsk")
	fmt.Println(age, ok)

	// 5. 读取或写入
	m.LoadOrStore("wsy", 100)//由于已经存在wsy，所以并没有写入，还是20
	age, _ = m.Load("wsy")
	fmt.Println(age)
}

```
## 3. 源码分析
### 3.1. 数据结构
- Map
```go
type Map struct {
	//互斥量 mu 保护 read 和 dirty
	mu Mutex
	//读是读这个
	//atomic.Value 类型，可以并发地读
	//如果要更新整个read，那么需要加锁
	read atomic.Value
	//写是写这个
	//一个非线程安全的map，新写入的key+read中未被删除的key
	//可以快速地将 dirty 提升为 read 对外提供服务
	dirty map[interface{}]*entry
	//每当从 read 中读取失败，都会将 misses 的计数值加 1，当加到一定阈值以后，需要将 dirty 提升为 read，以期减少 miss 的情形
	misses int
}
```
read 和 dirty 各自维护一套 key，key 指向的都是同一个 value。也就是说，只要修改了这个 entry，对 read 和 dirty 都是可见的

- readOnly

```go
//read实际是个readOnly的结构
type readOnly struct {
	m       map[interface{}]*entry
	amended bool // true if the dirty map contains some key not in m.
}


type entry struct {
	p unsafe.Pointer // 一个指针，指向 value
}
```
- 这个p有三种状态
    - nil：
    - expunged
    - 正常
![](https://raw.githubusercontent.com/TDoct/images/master/1598454242_20200826170057066_3435.png)

### 3.2. 方法

## 4. 总结
- sync.map 是线程安全的，读取，插入，删除也都保持着常数级的时间复杂度
- 通过读写分离，降低锁时间来提高效率，适用于读多写少的场景

## 5. 参考
- [深度解密 Go 语言之 sync\.map \- Stefno \- 博客园](https://www.cnblogs.com/qcrao-2018/p/12833787.html)
- [Hacking Go Maps for Fun and Profit](https://lukechampine.com/hackmap.html)
- [Deeply Understanding the Principle of Go\-sync\.Map](https://programmer.group/deeply-understanding-the-principle-of-go-sync.map.html)
- [源码解读 Golang 的 sync\.Map 实现原理 \- 知乎](https://zhuanlan.zhihu.com/p/115432432)
- [Go 1\.9 sync\.Map揭秘 \| 鸟窝](https://colobu.com/2017/07/11/dive-into-sync-Map/)