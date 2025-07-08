## 1. 为什么需要BloomFilter

### 1.1. BloomFiler vs HashSet
> 一个网站有 20 亿 url 存在一个黑名单中，这个黑名单要怎么存？
若此时随便输入一个 url，你如何快速判断该 url 是否在这个黑名单中？并且需在给定内存空间（比如：500M）内快速判断出

- 如果使用HashSet
    - 能满足O(1)的时间效率，但是空间效率不满足。
    - URL字符串通过Hash得到一个Integer，占用4个Byte。`20亿*4/1024/1024/1024=7.45G`的内存。


### 1.2. BloomFilter vs BitMap
- BitMap不支持整数之外的元素
- BitMap如果存储范围很大的整数，那么占用空间还是很大。BloomFilter之所以比BitMap空间小是因为它一个bit通过多个Hash函数可以表示多种意义
    - 比如1 到 10 亿，那位图的大小就是 10 亿个二进制位，也就是 120MB 

## 2. BloomFilter是什么

- 由**一组很长的二进制bit**和**一组hash函数**组成。
- 用于快速判断一个元素是否在一个集合中
    - 优点：能兼顾时空效率
        - 时间复杂度：O(k) ，k 是哈希函数的个数
        - 空间复杂度：O(m) ，m 是二进制位的个数
    - 缺点：有一定的识别错误(即不在集合中的元素会误认为是在集合中的)
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1613444540_20210216110211147_15492.png)



### 2.1. 如何减少误判率
可以使用多个hash函数计算，把多个bit位置为1；
判断的时候也是通过多个hash函数计算，如果这多个位也是1那么存在，有一个不是则不存在

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230091513.png)
关键在于创建长度为多少bit的数组和使用多少个hash函数。
可以通过一个公式计算出来，通过可以接受的误判率fpp和元素的总个数n
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230091526.png)

## 3. BloomFilter使用场景


1. 黑名单 
2. URL去重 
3. 单词拼写检查 
4. Key-Value缓存系统的Key校验 
5. ID校验，比如订单系统查询某个订单ID是否存在，如果不存在就直接返回。
6. Google在BigTable中就使用了BloomFilter，以避免在硬盘中寻找不存在的条目。
7. 用爬虫抓取网页时对网页url去重也需要用到BloomFilter。



## 4. 实现
### 4.1. Google Guava
[BloomFilter.md](../Java/Framework/Google_Guava/BloomFilter.md)
### 4.2. Redis
[BloomFilter.md](../Redis/使用/BloomFilter.md)


### 4.3. Golang
#### 4.3.1. 数据结构
- bit位
- hash函数
#### 4.3.2. API

```go
type IBloomFilter interface {
	//打印布隆过滤器
	String() string
	//布隆过滤器是否包含key
	Contains(key interface{}) bool
	//更新布隆过滤器中key对应的value
	Put(key interface{})
}

```
#### 4.3.3. 实现
```go

import (
	"fmt"
	"hash/crc32"
	"math"
)

type BloomFilter struct {
	//一共有多少个二进制位
	bitSize int
	//二进位使用int64实现
	bits []int64
	//哈希函数个数
	hashFuncSize int
}

//n：数据规模
//p：误判率，取值范围(0, 1)
func NewBloomFilter(n int, p float64) *BloomFilter {
	if n <= 0 || p <= 0 || p >= 1 {
		panic("wrong n or p")
	}
	//根据公式算出bitSize和hashFuncSize
	bitSize := -int((float64(n) * math.Log(p)) / (math.Ln2 * math.Ln2))
	hashFuncSize := int(float64(bitSize) * math.Ln2 / float64(n))

	//分页公式
	bitArraySize := (bitSize + 64 - 1) / 64
	bits := make([]int64, bitArraySize, bitArraySize)
	return &BloomFilter{
		bitSize:      bitSize,
		bits:         bits,
		hashFuncSize: hashFuncSize,
	}
}

func (b *BloomFilter) String() string {
	return fmt.Sprintf("bitsSize: %v, hashFuncSize: %v", b.bitSize, b.hashFuncSize)
}

func (b *BloomFilter) Contains(key interface{}) bool {
	//google guava bloom filter
	hash1 := hashCode(key)
	hash2 := hash1 >> 16
	for i := 1; i <= b.hashFuncSize; i++ {
		combinedHash := hash1 + (i * hash2)
		if combinedHash < 0 {
			combinedHash = ^combinedHash
		}
		// 生成一个二进制的索引
		index := combinedHash % b.bitSize
		// 查询第index位置的二进制是否为0
		if !b.get(index) {
			return false
		}
	}

	return true
}

// 查看index位置的二进制的值
// true代表1, false代表0
func (b *BloomFilter) get(index int) bool {
	//先找到存放在int64数组的哪个元素中
	value := b.bits[index/64]
	//在找到该元素中的哪一个位
	var bit int64 = 1 << (index % 64)
	//要取某一位的值，可以把这一位设为1，其他位设为0，然后使用与操作
	return (value & bit) != 0
}

func (b *BloomFilter) Put(key interface{}) {
	//google guava bloom filter
	hash1 := hashCode(key)
	hash2 := hash1 >> 16
	for i := 1; i <= b.hashFuncSize; i++ {
		combinedHash := hash1 + (i * hash2)
		if combinedHash < 0 {
			combinedHash = ^combinedHash
		}
		// 生成一个二进制的索引
		index := combinedHash % b.bitSize
		// 查询第index位置的二进制是否为0
		b.set(index)
	}

}

// 设置index位置的二进制为1
func (b *BloomFilter) set(index int) {
	//先找到存放在int64数组的哪个元素中
	value := b.bits[index/64]
	//在找到该元素中的哪一个位
	var bit int64 = 1 << (index % 64)
	//更新某一位的值，可以把这一位设为1，其他位设为0，然后使用或操作
	b.bits[index/64] = value | bit
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

```

##### 4.3.3.1. 测试
```go
func TestBloomFilter(t *testing.T) {
	bloomFilter := NewBloomFilter(10_0000_0000, 0.01)
	for i := 1; i <= 1_00_0000; i++ {
		bloomFilter.Put(i)
	}

	count := 0
	for i := 1; i <= 1_00_0000; i++ {
		if bloomFilter.Contains(i) {
			count++
		}
	}
	fmt.Println(count==1_00_0000)

	count = 0
	for i := 1_00_0001; i <= 2_00_0000; i++ {
		if bloomFilter.Contains(i) {
			count++
		}
	}

	fmt.Println(count)
}

```

## 5. 参考
- [【恋上数据结构】布隆过滤器（Bloom Filter）原理及实现\_Jerry House\-CSDN博客](https://blog.csdn.net/weixin_43734095/article/details/105766972)
- [Bloom Filters 容错率计算，布隆过滤器大小如何设置。 \- 知乎](https://zhuanlan.zhihu.com/p/282864286)