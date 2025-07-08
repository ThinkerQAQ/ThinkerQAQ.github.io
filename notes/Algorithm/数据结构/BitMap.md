## 1. BitMap是什么
- 又叫位图
- 把数据存放在一个以bit为单位的数据结构里，每位都只有0和1两个值。为0的时候，证明值不存在；为1的时候说明存在。

### 1.1. 举例

这个时候假如我们要存放2 4 6 8 9 10 17 19 21这些数字到我们的BitMap里，我们只需把对应的位设置为1就可以了。
```java
[0 0 0 1 0 1 0 1 0 0 0 0 0 0 1 1 1 0 1 0 1 0 1 0]
```

## 2. 为什么需要BitMap
> 假设我们有1千万个整数，整数的范围在1到1亿之间。如何快速查找某个整数是否在这1千万个整数中

- 如果使用HashMap实现，那么需要占用至少40MB
- 使用BitMap实现，那么只需要 1 亿个二进制位，也就是 12MB。因此相对于HashMap节省了空间
## 3. BitMap改进：BloomFilter
- [BloomFilter.md](BloomFilter.md)
## 4. 参考
- [BitMap的原理介绍与实现\_FlyWine的博客\-CSDN博客](https://blog.csdn.net/wf19930209/article/details/79120000)
- [【位图】：如何实现网页爬虫中的URL去重功能？\_南方以北\-CSDN博客](https://blog.csdn.net/qq_25800311/article/details/90736897)