
## 1. 什么是map
O(1)效率存取k-v对
## 2. map如何实现
数组。数组中每个元素叫做桶
### 2.1. 写入
### 2.2. 读取
## 3. 如何找到key所属的桶
- 第一种：取模运算：hash%m
- 第二种：按位与运算：hash&(m-1)
    - 这里m必须是2的幂次
## 4. 冲突了怎么办
- 开放寻址法
    - 写入：往后找下一个空闲桶
    - 读取：一直找到空桶或者key相等
- 链地址法：
    - 写入：链表
    - 读取：遍历链表，读到末尾或者key相等
## 5. 什么时候扩容
- 负载因子达到一定值
    - `loadFactor（负载因子） = keyCount（kv对个数） / bucketCount（桶个数）`
## 6. 怎么扩容
直接分配更多的桶，把旧桶里的kv对->新桶里
### 6.1. 怎么迁移
- 一次性扩容
    - 触发扩容的时候一次性把所有的kv对迁移到新桶
    - 缺点：每次扩容占用的时间太长会造成性能瞬时明显抖动
- 渐进式扩容
    - 触发扩容后先分配新桶，标记为正在扩容。在hash表读写的时候发现正在扩容，那么迁移一部分键值对到新桶里
    - 优点：把扩容消耗的时间分散到多次操作中

## 7. Golang的map源码
### 7.1. 桶的设计
- ![](https://raw.githubusercontent.com/TDoct/images/master/1618930300_20210420224927834_22504.png)
### 7.2. 溢出桶
- ![](https://raw.githubusercontent.com/TDoct/images/master/1618930301_20210420224953902_6831.png)
### 7.3. key
- ![](https://raw.githubusercontent.com/TDoct/images/master/1618930302_20210420225006424_17254.png)

### 7.4. 等量扩容

## 8. Golang举例说明
## 9. 是什么
K-V对。O（1）时间读取效率

## 10. 使用
```go
func testMap() {
	maps := map[int]string{
		1: "a",
		2: "b",
	}

	fmt.Println(maps)

	s, ok := maps[1]
	if ok {
		fmt.Println(s)
	}

	delete(maps, 1)
	fmt.Println(maps)

}
```
## 11. 原理
![](https://raw.githubusercontent.com/TDoct/images/master/1618846903_20210419234115878_19318.png)
### 11.1. 数据结构
Go 语言采用的是哈希查找表，并且使用链表解决哈希冲突

```go
// A header for a Go map.
type hmap struct {
    // 元素个数，调用 len(map) 时，直接返回此值
	count     int
	//状态。标识这个map读还是写
	flags     uint8
	// 桶的数量。这里是个对数
	B         uint8
	// 溢出的桶个数。go里一个桶只能放8个key，如果超过了8个那么会新增一个桶，这个新增的桶就是溢出的
	noverflow uint16
	// 计算 key 的哈希的时候会传入哈希函数
	hash0     uint32
    // 指向 buckets 数组，大小为 2^B
    // 如果元素个数为0，就为 nil
	buckets    unsafe.Pointer
	// 扩容的时候，oldbuckets指向原来的桶，buckets 长度会是 oldbuckets 的两倍
	oldbuckets unsafe.Pointer
	// 指示扩容进度，小于此地址的 buckets 迁移完成
	//比如B是5，那么总共有2^5=32个桶。如果这个值等于4，说明0-3号桶已经搬迁完毕
	nevacuate  uintptr
	extra *mapextra // optional fields
}
```
![](https://raw.githubusercontent.com/TDoct/images/master/1596974049_20200809195359319_16314.png)

- B是bucket数组长度的对数，即buckets数组的长度为2^B
#### 11.1.1. 桶
- buckets是个指针，指向一个数组，数组中的每个元素都是
```go
type bmap struct {
	tophash [bucketCnt]uint8
}
```
编译期间会给它加料，动态地创建一个新的结构
   
```go
type bmap struct {
    topbits  [8]uint8
    keys     [8]keytype
    values   [8]valuetype
    pad      uintptr
    overflow uintptr
}
```
    
![](https://raw.githubusercontent.com/TDoct/images/master/1596974158_20200809195552728_21011.png)
可以看出每个bmap都是由顺序的keys和顺序的values组成，而不是key、value、key、value这样。好处在于某些情况下可以省略掉 padding 字段，节省内存空间
可以看出每个bmap最多只能放 8 个 key-value 对，如果有第 9 个 key-value 落入当前的 bucket，那就需要再构建一个 bucket ，通过 overflow 指针连接起来。

- alg字段是个指针，指向
```go
// src/runtime/alg.go
type typeAlg struct {
	// (ptr to object, seed) -> hash
	hash func(unsafe.Pointer, uintptr) uintptr
	// (ptr to object A, ptr to object B) -> ==?
	equal func(unsafe.Pointer, unsafe.Pointer) bool
}
```
hash 函数计算类型的哈希值，而 equal 函数则计算两个类型是否“哈希相等”。

### 11.2. 创建
会调用makemap函数

```go
func makemap(t *maptype, hint int64, h *hmap, bucket unsafe.Pointer) *hmap {
	// 省略各种条件检查...

	// 找到一个 B，使得 map 的装载因子在正常范围内
	B := uint8(0)
	for ; overLoadFactor(hint, B); B++ {
	}

	// 初始化 hash table
	// 如果 B 等于 0，那么 buckets 就会在赋值的时候再分配
	// 如果长度比较大，分配内存会花费长一点
	buckets := bucket
	var extra *mapextra
	if B != 0 {
		var nextOverflow *bmap
		buckets, nextOverflow = makeBucketArray(t, B)
		if nextOverflow != nil {
			extra = new(mapextra)
			extra.nextOverflow = nextOverflow
		}
	}

	// 初始化 hamp
	if h == nil {
		h = (*hmap)(newobject(t.hmap))
	}
	h.count = 0
	h.B = B
	h.extra = extra
	h.flags = 0
	h.hash0 = fastrand()
	h.buckets = buckets
	h.oldbuckets = nil
	h.nevacuate = 0
	h.noverflow = 0

	return h
}
```
### 11.3. 查找
- 如何确定放在哪个桶里？
    - 取模法：hash % m    
    - 与运算：hash&(m-1)
        - m是2的幂次
#### 11.3.1. 不带comma
![](https://raw.githubusercontent.com/TDoct/images/master/1596975880_20200809202433247_21182.png)

```go
func mapaccess1(t *maptype, h *hmap, key unsafe.Pointer) unsafe.Pointer {
	// ……
	
	// 如果 h 什么都没有，返回零值
	if h == nil || h.count == 0 {
		return unsafe.Pointer(&zeroVal[0])
	}
	
	// 写和读冲突
	if h.flags&hashWriting != 0 {
		throw("concurrent map read and map write")
	}
	
	// 不同类型 key 使用的 hash 算法在编译期确定
	alg := t.key.alg
	
	// 计算哈希值，并且加入 hash0 引入随机性
	hash := alg.hash(key, uintptr(h.hash0))
	
	// 比如 B=5，那 m 就是31，二进制是全 1
	// 求 bucket num 时，将 hash 与 m 相与，
	// 达到 bucket num 由 hash 的低 8 位决定的效果
	m := uintptr(1)<<h.B - 1
	
	// b 就是 bucket 的地址
	b := (*bmap)(add(h.buckets, (hash&m)*uintptr(t.bucketsize)))
	
	// oldbuckets 不为 nil，说明发生了扩容
	if c := h.oldbuckets; c != nil {
	    // 如果不是同 size 扩容（看后面扩容的内容）
	    // 对应条件 1 的解决方案
		if !h.sameSizeGrow() {
			// 新 bucket 数量是老的 2 倍
			m >>= 1
		}
		
		// 求出 key 在老的 map 中的 bucket 位置
		oldb := (*bmap)(add(c, (hash&m)*uintptr(t.bucketsize)))
		
		// 如果 oldb 没有搬迁到新的 bucket
		// 那就在老的 bucket 中寻找
		if !evacuated(oldb) {
			b = oldb
		}
	}
	
	// 计算出高 8 位的 hash
	// 相当于右移 56 位，只取高8位
	top := uint8(hash >> (sys.PtrSize*8 - 8))
	
	// 增加一个 minTopHash
	if top < minTopHash {
		top += minTopHash
	}
	for {
	    // 遍历 8 个 bucket
		for i := uintptr(0); i < bucketCnt; i++ {
		    // tophash 不匹配，继续
			if b.tophash[i] != top {
				continue
			}
			// tophash 匹配，定位到 key 的位置
			k := add(unsafe.Pointer(b), dataOffset+i*uintptr(t.keysize))
			// key 是指针
			if t.indirectkey {
			    // 解引用
				k = *((*unsafe.Pointer)(k))
			}
			// 如果 key 相等
			if alg.equal(key, k) {
			    // 定位到 value 的位置
				v := add(unsafe.Pointer(b), dataOffset+bucketCnt*uintptr(t.keysize)+i*uintptr(t.valuesize))
				// value 解引用
				if t.indirectvalue {
					v = *((*unsafe.Pointer)(v))
				}
				return v
			}
		}
		
		// bucket 找完（还没找到），继续到 overflow bucket 里找
		b = b.overflow(t)
		// overflow bucket 也找完了，说明没有目标 key
		// 返回零值
		if b == nil {
			return unsafe.Pointer(&zeroVal[0])
		}
	}
}
```

#### 11.3.2. 带comma

```go
func mapaccess2(t *maptype, h *hmap, key unsafe.Pointer) (unsafe.Pointer, bool)    
```

### 11.4. 添加
#### 11.4.1. 扩容逻辑
- 渐进式扩容：把k-v对迁移的时间分摊到多次hash表操作中
- 装载因子的计算：`loadFactor := count / (2^B)`，count 就是 map 的元素个数，2^B 表示 bucket 数量。
- 两种情况触发扩容：
    - 装载因子超过阈值，源码里定义的阈值是 6.5
    - overflow 的 bucket 数量过多：当 B 小于 15，也就是 bucket 总数 2^B 小于 2^15 时，如果 overflow 的 bucket 数量超过 2^B；当 B >= 15，也就是 bucket 总数 2^B 大于等于 2^15，如果 overflow 的 bucket 数量超过 2^15。
- ![](https://raw.githubusercontent.com/TDoct/images/master/1618846588_20210419233623279_11498.png)
### 11.5. 删除
```go
func mapdelete(t *maptype, h *hmap, key unsafe.Pointer)
```
先找到位置，接着清零

```go
// 对 key 清零
if t.indirectkey {
	*(*unsafe.Pointer)(k) = nil
} else {
	typedmemclr(t.key, k)
}

// 对 value 清零
if t.indirectvalue {
	*(*unsafe.Pointer)(v) = nil
} else {
	typedmemclr(t.elem, v)
}
```
## 12. 参考
- [深度解密Go语言之map \| qcrao](https://qcrao.com/2019/05/22/dive-into-go-map/)
- [Hacking Go Maps for Fun and Profit](https://lukechampine.com/hackmap.html)
- [Go maps in action \- The Go Blog](https://blog.golang.org/maps)
- [go \- Golang equivalent of hashcode\(\) and equals\(\) method \- Stack Overflow](https://stackoverflow.com/questions/49523077/golang-equivalent-of-hashcode-and-equals-method)