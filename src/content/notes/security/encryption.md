---
title: "1.4 加密"
description: "对称加密、分组模式、非对称加密、RSA 与基础实现。"
sourcePath: "Safe/加密.md"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 4
tags: ["Security"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 加密是什么
## 2. 加密特性
机密性
## 3. 加密三要素
### 3.1. 加密
- 明文
- 密钥
- 加密算法
### 3.2. 解密
- 密文
- 密钥
- 解密算法：可能跟加密算法不同

## 4. 加密算法分类

### 4.1. 对称加密
#### 4.1.1. 是什么
- 通信双方共享同一个密钥
- 优点：加解密效率高
- 缺点：需要安全地分发和保管共享密钥
#### 4.1.2. 凯撒密码

![](https://raw.githubusercontent.com/TDoct/images/master/1593173182_20200620112216892_4915.png)
#### 4.1.3. DES
不推荐使用，DES 已不适合现代安全场景。

- 加密
![](https://raw.githubusercontent.com/TDoct/images/master/1593173209_20200626192149913_32146.png)
- 解密
![](https://raw.githubusercontent.com/TDoct/images/master/1593173210_20200626192206224_12108.png)
- 密钥
长度为8bytes
- 分组
8bytes
#### 4.1.4. 3DES
Triple DES。新系统也不应再优先选择 3DES。

- 加密
中间使用解密的原因是为了兼容以前的DES
![](https://raw.githubusercontent.com/TDoct/images/master/1593173186_20200620113320479_10877.png)

- 解密
![](https://raw.githubusercontent.com/TDoct/images/master/1593173188_20200620113348122_19436.png)

- 密钥
长度为8bytes，总共3个密钥，所以总长度为24bytes
密钥1和密钥2相同，或者密钥2和密钥3相同，就是DES

- 分组
8bytes
#### 4.1.5. AES
现代系统优先使用 AES，并应配合合适的认证加密模式（如 GCM）或额外的完整性保护。
- 密钥
长度可选，16、24、32
- 分组
16bytes

### 4.2. 分组模式
DES、3DES、AES都属于分组密码，即每次只能处理特定长度的一块（block）数据的一类加解密
如果要加密的明文比较长，就需要对加密进行迭代
#### 4.2.1. 分组与对称加密的关系
![](https://raw.githubusercontent.com/TDoct/images/master/1593173190_20200620113944098_3690.png)
#### 4.2.2. ECB
- 需要分组，分组长度根据算法而定
- 对数据分组之后需要填充
- 加密效率高，但是相同明文块会产生相同密文块，会泄露数据模式，因此不应直接用于一般数据加密
- 可以并行加解密
![](https://raw.githubusercontent.com/TDoct/images/master/1593173215_20200626193650093_31659.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173217_20200626193659840_22819.png)

#### 4.2.3. CBC
- 需要分组，分组长度根据算法而定
- 对数据分组之后需要填充
- 需要提供初始化向量
- 每一个密文都是下一个加密操作的输入
- 不能并行加密，可以并行解密

![](https://raw.githubusercontent.com/TDoct/images/master/1593173212_20200626193549188_1009.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173214_20200626193557901_18297.png)

#### 4.2.4. CFB
- 需要分组，分组长度根据算法而定
- 没有直接对明文分组加密，故不需要填充
- 需要提供初始化向量
- 相对初始化向量加密，然后再与明文异或
- 支持并行解密，不支持并行加密
![](https://raw.githubusercontent.com/TDoct/images/master/1593173218_20200626193950223_12093.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173242_20200626194001366_2906.png)

#### 4.2.5. OFB
- 需要分组，分组长度根据算法而定
- 没有直接对明文分组加密，故不需要填充
- 是对初始化向量的结果不断进行加密，作为下一次加密的数据来源
![](https://raw.githubusercontent.com/TDoct/images/master/1593173244_20200626194158023_7668.png)![](https://raw.githubusercontent.com/TDoct/images/master/1593173246_20200626194205658_27334.png)

#### 4.2.6. CTR
- 需要分组，分组长度根据算法而定
- 没有直接对明文分组加密，故不需要填充
- 可以并行加解密
![](https://raw.githubusercontent.com/TDoct/images/master/1593173192_20200620131420479_15159.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173194_20200620131433329_3006.png)

### 4.3. 非对称加密
#### 4.3.1. 是什么
- 密钥有两个：公钥可以公开，私钥必须由持有者安全保管
    - 签名和验签：私钥签名，公钥验签，用于验证完整性和签名者身份
    - 加密和解密：公钥加密，私钥解密。目的是防止信息被第三方拦截和偷听
- 缺点：加密解密效率很低
- 优点：公开公钥不需要传输私钥

![](https://raw.githubusercontent.com/TDoct/images/master/1593173196_20200625103233745_12095.png)
#### 4.3.2. RSA算法
![](https://raw.githubusercontent.com/TDoct/images/master/1593173198_20200625104316638_28549.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173200_20200625104332702_30648.png)

#### 4.3.3. 数学原理
- 假设由两个很大的质数：p和q
- 记它们的乘积为：N=p * q
这里p * q计算很快，但是由N反推回p和q代价非常大，目前没有行之有效的公式
- 计算出比N小且与N互质的自然数的个数：φ(n)=(p-1) * (q-1)。这个公式由集合论证明
- 找出比φ(n)小且与之互质的自然数，记为e
- 有了e和φ(n)后，根据辗转相除法的原理，可以找到x和y，即e * x - φ(n) * y=1
- 把φ(n)=(p-1) * (q-1)代入，移动一下位置就有了e * x = 1 + （p - 1）* (q - 1) * y
- **最后我们有了N，e，x， 公钥就是N和e，私钥就是x**
#### 4.3.4. 工作过程

- 加密要用公钥（N，e）
    - 假设明文是A，那么根据`A的e次方=R（mod N）`，公式的意思`A的e次方 / N得到的余数是R`，计算出的R就是密文
- 解密要用私钥x
    - 假设密文是R，那么根据`R的x次方 = A （mod N）`，公式的意思`R的x次方 / N得到的余数是A`，计算出的A就是明文

##### 4.3.4.1. 欧拉函数
上面加密解密的过程的原理是欧拉函数：
- `A的e次方=R（mod N）`和`R的x次方 = A （mod N）`，可以看出`A的e次方`和`R的x次方`同余，换句话说`A的e次方 / R 余数是N，R的x次方 / A余数是N`，这里代入公式没搞懂
- 且由于`e * x - φ(n) * y=1`，即`A的e*x次方 = A的（1+φ(n) * y）次方 = A * A的（φ(n) * y）次方`，这里φ(n) * y = 1的原理就是欧拉函数

## 5. 实现
### 5.1. OpenSSL

```cmd
openssl

# 生成私钥
> genrsa -out rsa_private_key.pem

# 生成公钥
> rsa -in rsa_private_key.pem -pubout -out rsa_public_key.pem
```
### 5.2. Golang实现
#### 5.2.1. AES-CTR

```go
package main

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "fmt"
    "io"
)

func cryptCTR(key, iv, input []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    output := make([]byte, len(input))
    cipher.NewCTR(block, iv).XORKeyStream(output, input)
    return output, nil
}

func main() {
    key := make([]byte, 32)
    if _, err := io.ReadFull(rand.Reader, key); err != nil {
        panic(err)
    }
    iv := make([]byte, aes.BlockSize)
    if _, err := io.ReadFull(rand.Reader, iv); err != nil {
        panic(err)
    }

    plaintext := []byte("hello")
    ciphertext, _ := cryptCTR(key, iv, plaintext)
    recovered, _ := cryptCTR(key, iv, ciphertext)
    fmt.Println(string(recovered))
}
```

## 6. 参考
- [go 对称加密算法aes \- 掘金](https://juejin.im/post/5d2b0fbf51882547b2361a8a)
- [Base64 编码原理及代码实现 \- 掘金](https://juejin.im/post/5d28c454e51d45108223fd00)
- [对称加密算法和分组密码的模式 \- 简书](https://www.jianshu.com/p/b63095c59361)
- [消息认证码是怎么一回事？](https://halfrost.com/message_authentication_code/)
- [RSA算法原理（一） \- 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2013/06/rsa_algorithm_part_one.html)
- [RSA算法原理（二） \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2013/07/rsa_algorithm_part_two.html)
- [哈希\(Hash\)与加密\(Encrypt\)的基本原理、区别及工程应用 \- T2噬菌体 \- 博客园](https://www.cnblogs.com/leoo2sk/archive/2010/10/01/hash-and-encrypt.html)
- [常用密码技术 | 爱编程的大丙](https://subingwen.cn/golang/cryptology/)
