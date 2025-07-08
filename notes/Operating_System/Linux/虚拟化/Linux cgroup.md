## 1. Linux cgroup历史
- Google的工程师开发了process containers，之后重命名为control group
- Linux 内核 2.6版本支持了cgroup
## 2. 什么是Linux cgroup
limits how much you can use
Linux内核的一种特性，**限制**进程的资源使用。这些资源包括CPU、内存、磁盘IO、网络等
## 3. 为什么需要Linux cgroup
通过限制资源的使用率从而支持虚拟化，比如容器技术

## 4. 如何使用Linux cgroup
cgroup给用户暴露的接口是操作系统文件，位于`/sys/fs/cgroup`下
### 4.1. 查看进程所属的 cgroups
`/proc/[pid]/cgroup`
### 4.2. 限制进程可用的CPU
1. 创建**控制组**
```cmd
cd  /sys/fs/cgroup/cpu
mkdir container
ls container/
cgroup.clone_children cpu.cfs_period_us cpu.rt_period_us  cpu.shares notify_on_release
cgroup.procs      cpu.cfs_quota_us  cpu.rt_runtime_us cpu.stat  tasks
```
2. 写一个死循环的程序并运行
```sh
while : ; do : ; done &
[1] 226
```
3. 配置CPU**子系统**：每100 ms的时间里，被该控制组限制的进程只能使用20 ms的CPU时间，也就是说这个进程只能使用到20%的CPU带宽
```cmd
echo 100000 > container/cpu.cfs_period_us
echo 20000 > container/cpu.cfs_quota_us
```
4. cgroup限制**task**
```cmd
echo 226 > /sys/fs/cgroup/cpu/container/tasks
# 或者
cgexec -g cpu:container ./需要限制的程序
```
5. 使用top或者time命令验证
## 5. Linux cgroup缺点
### 5.1. /proc

Linux下的/proc目录存储的是记录当前内核运行状态的一系列特殊文件，用户可以通过访问这些文件，查看系统以及当前正在运行的进程的信息，比如CPU使用情况、内存占用率等，这些文件也是top指令查看系统信息的主要数据来源。

但是，你如果在容器里执行top指令，就会发现，它显示的信息居然是宿主机的CPU和内存数据，而不是当前容器的数据。

造成这个问题的原因就是，/proc文件系统并不知道用户通过Cgroups给这个容器做了什么样的资源限制，即：/proc文件系统不了解Cgroups限制的存在
## 6. Linux cgroup原理

## 7. 参考
- [浅谈Linux Cgroups机制 \- 知乎](https://zhuanlan.zhihu.com/p/81668069#:~:text=Cgroups%E5%85%A8%E7%A7%B0Control%20Groups%EF%BC%8C%E6%98%AF,%E8%A2%AB%E6%9A%82%E5%81%9C%E6%88%96%E8%80%85%E6%9D%80%E6%8E%89%E3%80%82)
- [linux cgroups 简介 \- sparkdev \- 博客园](https://www.cnblogs.com/sparkdev/p/8296063.html)
- [Linux内核中有哪些比较牛逼的设计? \- 知乎](https://www.zhihu.com/question/332710035/answer/1854780284?utm_oi=1337530756479447041&utm_source=pocket_mylist)