## 1. 日志


### 1.1. 日志目录结构
![](https://raw.githubusercontent.com/TDoct/images/master/1586403039_20200409112512239_2276.png)

```sh
<topic>-<partition> 
    xxx.index （xxx是第一个日志的offset）
    xxx.log
    xxx.timeindex
```
- 每个partition一个文件夹，包含四类文件`.index` `.log` `.timeindex` `leader-epoch-checkpoint`
- `.index` `.log` `.timeindex`三个文件成对出现 前缀为上一个segment的最后一个消息的偏移
    - `.log`文件中保存了所有的消息
    - `.index`文件中保存了稀疏的相对偏移的索引
    - `.timeindex`保存的则是时间索引
    - `.leader-epoch-checkpoint`中保存了每一任leader开始写入消息时的offset 会定时更新；follower被选为leader时会根据这个确定哪些消息可用

### 1.2. 查找消息的过程
#### 1.2.1. 有哪些索引文件
每个log-segment对应两个索引`.index`、`.timeindex`，用来提高查找消息的效率
- `.index`：offset->物理地址
- `.timeindex`：timestamp->offset
索引以[稀疏索引](../../Algorithm/数据结构/稀疏索引.md)的形式存储，每写入一定量的消息才会增加一个索引项，查找的时候通过二分法查找（不大于该offset的最大offset）
- `.index`
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1619360566_20210425161437590_44.png)
- `.timeindex`
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1619360571_20210425161458019_2215.png)
#### 1.2.2. 通过offset查找
Kafka中的索引文件是稀疏索引，并不保证每个消息在索引文件中都有对应的索引项，offset索引文件是单调递增的，查询指定offset时，使用二分查找法来快速定位offset的位置，如果指定的offset不在索引文件中，则会返回不大于指定offset的最大offset。

#### 1.2.3. 通过时间查找
timestamp的索引文件也保持严格的单调递增，同样使用二分查找法找到此timestamp对应的offset，再根据此offset去查找offset的索引文件再次定位。
### 1.3. 日志清理的策略
- 日志删除：按照一定的保留策略直接删除不符合条件的日志分段
- 日志压缩：针对每个消息的key进行整合，对于有相同的key，不同value值，只保留最后一个版本
#### 1.3.1. 日志删除
- 有一个专门的日志删除任务周期性的检测和删除不符合条件的日志分段
- 3种保留策略
    - 基于时间：日志删除任务会检查当前日志文件中是否有保留时间超过设定阈值的日志分段文件集合。阈值可以通过broker端参数log.retention.hours、log.retention.minutes和log.retention.ms来配置，优先级依次提高。默认情况只配置了log.retention.hours参数，其值为168，即日志分段文件的默认保留时间为7天。
    - 基于日志大小：日志删除任务会检查当前日志文件中是否有文件大小超过设定阈值的日志分段文件集合。阈值可以通过broker端参数log.retention.bytes（此配置是Log中所有的日志文件的总大小）来配置，默认值为-1，表示无穷大；单个日志分段大小的配置为log.segment.bytes来限制，默认值为1073741824，即为1GB
    - 基于日志起始偏移量：基于日志起始偏移量的保留策略的判断依据是某日志分段的下一个日志分段的起始偏移量baseOffset是否小于logStartOffset，若是则可以删除此日志分段。
#### 1.3.2. 日志压缩
针对每个消息的key进行整合，对于有相同的key，不同value值，只保留最后一个版本

## 2. Kafka为什么这么快
- 零拷贝
    - [零拷贝机制.md](../../Operating_System/Linux/IO/零拷贝机制.md)
    - 非零拷贝：4次拷贝，4次上下文切换
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1619275578_20210424224245788_18856.png)
    - 零拷贝：2次拷贝，2次上下文切换
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1619275579_20210424224304293_24728.png)
- 消息顺序追加（磁盘顺序读写由于内存随机读写）
    - 首先常识来说内存肯定是比磁盘快的，这里说的是虚拟内存机制下的磁盘读写和内存读写
    - 磁盘顺序读写利用的是虚拟内存的局部性原理，内存随机读写是虚拟内存的缺页中断
- 页缓存
    - 磁盘IO：应用程序 buffer-> C 库标准 IObuffer->文件系统页缓存->通过具体文件系统到磁盘。
    - 读的时候从页缓存拉，有直接返回；没有再去磁盘拉，放入页缓存
    - 写的时候数据交给操作系统的页缓存而不是直接落盘，定期刷入磁盘