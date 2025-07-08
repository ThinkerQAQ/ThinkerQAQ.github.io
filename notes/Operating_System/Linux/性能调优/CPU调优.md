## 1. CPU性能指标
### 1.1. CPU使用率
非空闲时间占总 CPU 时间的百分比。
根据 CPU 上运行任务的不同，又被分为用户 CPU、系统 CPU、等待 I/O CPU、软中断和硬中断等
- 用户CPU：应用程序
- 系统CPU：内核（不包括中断）
- 等待IO CPU：系统与硬件设备交互
- 软中断和硬中断：内核调用中断处理程序
### 1.2. 平均负载
系统的平均活跃进程数。它反应了系统的整体负载情况，主要包括三个数值，分别指过去 1 分钟、过去 5 分钟和过去 15 分钟的平均负载。理想情况应该等于逻辑CPU个数
### 1.3. 上下文切换
进程上下文切换会把CPU时间消耗在寄存器、内核栈和虚拟内存等数据的保存和恢复上，导致进程运行时间缩短
主要包括
- 无法获取资源而导致的自愿上下文切换；
- 被系统强制调度导致的非自愿上下文切换
### 1.4. CPU缓存命中率
CPU和内存之间的缓存，主要包括L1、L2、L3
## 2. CPU性能工具
### 2.1. top
[top.md](../命令/top.md)
### 2.2. pidstat
[pidstat.md](../命令/pidstat.md)
### 2.3. vmstat
[vmstat.md](../命令/vmstat.md)
### 2.4. perf
[perf.md](../命令/perf.md)
### 2.5. ps
[ps.md](../命令/ps.md)
### 2.6. pstree
[pstree.md](../命令/pstree.md)
## 3. 如何分析CPU性能瓶颈
### 3.1. 查看是否CPU瓶颈
- top命令查看CPU负载（load average）和CPU使用率（%Cpu），如果两者都高那么确实是CPU瓶颈

### 3.2. 找到CPU占用高的进程
- `top`命令，按下`P`查看哪个进程CPU使用率（%Cpu）高，记录其PID
### 3.3. 分析进程
- 如果是Java进程
    1. [Java线上问题排查.md](../../../Java/JVM/调优/Java线上问题排查.md)
- 如果是Golang进程
    1. [pprof](../../../Golang/pprof.md)
- 如果是MySQL进程
    1. [MySQL线上问题排查.md](../../../Database/MySQL/MySQL线上问题排查.md)


## 4. 参考
- [\#yyds干货盘点\# Linux系统中负载较高问题排查思路与解决方法\_用Python画画的小白的技术博客\_51CTO博客](https://blog.51cto.com/u_13640003/4603428)