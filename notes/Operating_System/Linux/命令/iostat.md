
### 1. 使用
```sh
iostat
```
- 默认输出的不是当前IO状态，而是系统启动以来的
### 2. 输出
- ![](https://raw.githubusercontent.com/TDoct/images/master/1618739080_20210418173137986_5674.png)
### 3. 解释
- avg-cpu
    - %user：用户模式花费的CPU时间 一般<60%
    - %nice：用户进程改变过优先级的进程占用的CPU时间
    - %system：内核进程所花费的CPU时间。一般sy+us<80%
    - %iowait：IO等待所占用的CPU时间 一般<30%
    - %steal：丢失时间占用CPU
    - %idle：CPU处于中断（空闲）状态的时间
- Device：
    - Device：设备名。可以在/dev/mapper下查找对应谁
        - -N可以将dm转成LVM名
    - tps：设备每秒接受的IO传输请求
    - kB_read/s：设备每秒读取的数据量（KB）
        - -m可换成MB
    - KB_wrtn/s：设备每秒写入的数据量（KB）
    - KB_read：设备读取的总数据量
    - KB_wrtn：设备写入的总数据量
### 4. 如何判断CPU/IO瓶颈
- %idle20%以下，瓶颈在CPU
- %iowait高而%idle在70%以上，瓶颈在IO


### 5. 如何发现IO瓶颈
- 了解磁盘速率
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1618739081_20210418174037400_6025.png)
- 使用
```sh
# 每隔2s统计一次，总共统计3次
iostat -xdk 2 3
```
- 结果
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191231215916.png)
- 解析
    - rkB/s表示每秒读取的数据量，单位kB
    - wkB/s表示每秒写入的数据量，单位kB
    - await：平均等待时间
        - SSD：1ms左右有问题
        - 机械硬盘：8ms左右有问题
    - util：IO利用率。
        - 表示一秒中有百分几的时间用于IO操作。接近100%时表示磁盘带宽跑满，需要优化程序或增加磁盘
        - 当然由于硬盘设备有并行处理多个IO请求的能力，所以即使100%也不意味着设备饱和
