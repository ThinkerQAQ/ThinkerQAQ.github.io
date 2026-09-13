---
title: "2.1 BloomFilter"
description: "1. 使用 2. 源码分析 - 关键属性 - 创建BloomFilter - put方法 MURMUR128 MITZ 32默认 抽象来看，put是写，mightContain是读，两个方法的代码有一点相似，都是先利用murmur3 hash对输入的funnel计算得到128位的字节数组，然后高低分"
sourcePath: "Java/Framework/Google_Guava/BloomFilter.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 3
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-03-21T13:01:24Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---





## 1. 使用
```java
BloomFilter<Integer> integerBloomFilter = BloomFilter.create(Funnels.integerFunnel(), 1024 * 1024 * 32, 0.0000001d);
integerBloomFilter.put(1);
integerBloomFilter.put(2);
integerBloomFilter.put(3);

boolean c4 = integerBloomFilter.mightContain(4);
boolean c3 = integerBloomFilter.mightContain(3);
System.out.println(c4);
System.out.println(c3);
```


## 2. 源码分析
- 关键属性

```java
BloomFilter
	//bit数组
  private final BitArray bits;

  //hash函数的个数
  private final int numHashFunctions;

    //接口，把任意类型转换成Java基本类型
  private final Funnel<? super T> funnel;

  	//对bit数组操作的接口，put方法，mightContain方法
  private final Strategy strategy;
```

- 创建BloomFilter
```java
static <T> BloomFilter<T> create(
      Funnel<? super T> funnel, int expectedInsertions /* n */, double fpp, Strategy strategy) {
    checkNotNull(funnel);
    checkArgument(expectedInsertions >= 0, "Expected insertions (%s) must be >= 0",
        expectedInsertions);
    checkArgument(fpp > 0.0, "False positive probability (%s) must be > 0.0", fpp);
    checkArgument(fpp < 1.0, "False positive probability (%s) must be < 1.0", fpp);
    checkNotNull(strategy);

    if (expectedInsertions == 0) {
      expectedInsertions = 1;
    }

    	//通过期望元素个数和误差率计算bit数组长度
    long numBits = optimalNumOfBits(expectedInsertions, fpp);
    	//通过期望元素个数和误差率计算hash函数个数
    int numHashFunctions = optimalNumOfHashFunctions(expectedInsertions, numBits);
    try {
    		//通过bit数组、hash函数个数、类型转换接口、对bit数组操作的接口创建BloomFilter
      return new BloomFilter<T>(new BitArray(numBits), numHashFunctions, funnel, strategy);
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Could not create BloomFilter of " + numBits + " bits", e);
    }
  }
```

- put方法
MURMUR128_MITZ_32默认
抽象来看，put是写，mightContain是读，两个方法的代码有一点相似，都是先利用murmur3 hash对输入的funnel计算得到128位的字节数组，然后高低分别取8个字节（64位）创建2个long型整数hash1，hash2作为哈希值。循环体内采用了2个函数模拟其他函数的思想，即上文提到的gi(x) = h1(x) + ih2(x) ，这相当于每次累加hash2，然后通过基于bitSize取模的方式在bit数组中索引
```java
public <T> boolean put(T object, Funnel<? super T> funnel, int numHashFunctions, BloomFilterStrategies.BitArray bits) {
    long bitSize = bits.bitSize();
    byte[] bytes = Hashing.murmur3_128().hashObject(object, funnel).getBytesInternal();
    long hash1 = this.lowerEight(bytes);
    long hash2 = this.upperEight(bytes);
    boolean bitsChanged = false;
    long combinedHash = hash1;

    for(int i = 0; i < numHashFunctions; ++i) {
        bitsChanged |= bits.set((combinedHash & 9223372036854775807L) % bitSize);
        combinedHash += hash2;
    }

    return bitsChanged;
}
```

- mightContain方法
MURMUR128_MITZ_32默认
```
public <T> boolean mightContain(T object, Funnel<? super T> funnel, int numHashFunctions, BloomFilterStrategies.BitArray bits) {
    long bitSize = bits.bitSize();
    byte[] bytes = Hashing.murmur3_128().hashObject(object, funnel).getBytesInternal();
    long hash1 = this.lowerEight(bytes);
    long hash2 = this.upperEight(bytes);
    long combinedHash = hash1;

    for(int i = 0; i < numHashFunctions; ++i) {
        if (!bits.get((combinedHash & 9223372036854775807L) % bitSize)) {
            return false;
        }

        combinedHash += hash2;
    }

    return true;
}
```


### 2.1. 总结

S集合有n个元素，这n个元素使用k个hash函数，映射到长度为m bit的数组B中。m和k的值取决于误判率fpp和元素总个数n

`static <T> BloomFilter<T> create(Funnel<? super T> funnel, int expectedInsertions /* n */, double fpp, Strategy strategy)`
- 输入的数据funnel
用来计算128bit的数组

- 预计插入的元素总数expectedInsertions、期望误判率fpp

- Strategy
有put、mightContain方法
- put方法
对funnel计算得到128bit的数组，取高64bit和低64bit创建两个hash函数，通过这两个获取第三个hash函数
用这些hash函数计算元素的hashCode并对bit长度取余数，置1
- mightContain方法
同put
遍历每个hash函数，计算是否全为1，是则存在




## 3. 参考
- [\[轮子系列\]Google Guava之BloomFilter源码分析及基于Redis的重构 \- 个人文章 \- SegmentFault 思否](https://segmentfault.com/a/1190000012620152#articleHeader2)
