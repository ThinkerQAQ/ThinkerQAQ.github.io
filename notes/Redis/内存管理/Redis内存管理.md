
## 1. 内存消耗划分
### 1.1. used_memory
- `used_memory=自身内存+对象内存+缓冲内存`
#### 1.1.1. 自身内存
redis进程，一般可以忽略
#### 1.1.2. 对象内存
- `sizeof(key)+sizeof(value)`，占用最大
- 解决
    - 使用序列化缩减对象大小
    - 编码优化
#### 1.1.3. 缓冲内存
`缓冲内存=客户端缓冲+复制积压缓冲+AOF缓冲`
### 1.2. 内存碎片
- `used_memory_rss-used_memory=内存碎片`
    - 现代的内存分配器都是使用固定范围内存块，并向上取整
- 解决
    - 重启可以整理
## 2. 如何查看内存消耗
- `info memory`查看`used_memory_rss`、`used_memory`和`mem_fragmentation_ratio`
    - `mem_fragmentation_ratio=used_memory_rss/used_memory`
    - 如果`mem_fragmentation_ratio`>1，说明存在内存碎片
    - 如果`mem_fragmentation_ratio`<1，说明Linux把Redis交换到磁盘上
## 3. 如何进行内存管理

### 3.1. 内存淘汰策略
- 设置max_memory+内存淘汰策略
- [Redis内存淘汰策略.md](Redis内存淘汰策略.md)

### 3.2. key过期
- [Redis key过期策略.md](Redis%20key过期策略.md)

### 3.3. 内存优化
- [Redis内存优化.md](Redis内存优化.md)