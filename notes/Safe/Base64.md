## 1. Base64是什么
由于某些系统（比如网址）只支持ASCII字符，Base64就是将非ASCII转成ASCII字符的一种方法

## 2. Base64流程
1. 将待转换的字符串以每 3 个字节分为一组，1byte = 8bit，每一组正好 24 个二进制位。
2. 将上面的 24 个二进制位划分为每 6 位一组，形成 4 组。
3. 每组前面加两个 0，形成 8 位一组，即 4 个字节。
4. 根据上面 Base64 对照表获取对应的值，形成 Base64 编码。
## 3. Base64使用场景
传输二进制图片


## 4. Base64 vs URL编码
[URL编码.md](../Computer_Network/应用层/HTTP/URL编码.md)

## 5. 参考
- [Base64和urlencode \- 简书](https://www.jianshu.com/p/b611e220ef2d)