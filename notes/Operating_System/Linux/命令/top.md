### 1. 使用
```sh
top
```
- 敲下h查询帮助菜单
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1618729302_20210418150138982_7476.png)


- 查看某进程CPU使用率

```
 top -p `pgrep -f webcast_gorm_encryption`
```
### 2. 输出
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229165319.png)
### 3. 解析
- `top - 13:57:40 up  1:47,  0 users,`
    - 13:57:40：当前系统时间，可以用date获取
    - up  1:47：此系统已经连续运行的时间，可以用last reboot获取系统最后一次重启的时间
    -  0 users：系统当前登录的用户数，可以用who获取
- `load average: 0.52, 0.58, 0.59`
    - 前1、5、15分钟系统的平均负载
        - 0.59表示从当前时间到过去的15分钟内大概有0.59个进程（线程）在等待CPU资源。换句话说就是41%的时间CPU是闲着的
    - 这个值是针对单核处理器制定的，如果是多核的，需要除以CPU核数
        - `grep 'model name' /proc/cpuinfo | wc -l`可获取CPU核数
        - 也可以在top命令下敲下`1`获取CPU核数
    - 单核的负载应该在1一下，一半0.7以下算正常
- `Tasks:  17 total,   1 running,  16 sleeping,   0 stopped,   0 zombie`
    - 17 total：系统现在共有17个进程
    - 1 running：处理运行中的进程有1个
        - 运行状态：进程在运行或者在运行队列中
    - 16 sleeping：处于休眠中状态的进程有16个
        - 休眠状态：进程在等待事件完成
    - 0 stopped：处于停止中状态的进程有16个
        - 停止状态：进程接收到STOP信号
    - 0 zombie：处于僵尸中状态的进程有16个
        - 僵尸状态：如果子进程退出，父进程运行但没有获取到子进程的退出状态，子进程为僵尸状态
- `%Cpu(s):  2.1 us,  2.7 sy,  0.0 ni, 94.3 id,  0.0 wa,  0.9 hi,  0.0 si,  0.0 st`
    - %Cpu(s)：CPU状态，百分比形式
    - 2.1 us：用户模式下所花费的CPU时间。一般<60%
    - 2.7 sy：内核进程所花费的CPU时间。一般sy+us<80%
    - 0.0 ni：用户进程改变过优先级的进程占用的CPU时间
    - 94.3 id：CPU处于中断（空闲）状态的时间
    - 0.0 wa：IO等待所占用的CPU时间。一般<30%
    - 0.9 hi：硬件中断占用的CPU
    - 0.0 si：软件中断占用的CPU
    - 0.0 st：丢失时间占用的CPU
- `KiB Mem : 25010324 total, 16740476 free,  8040496 used,   229352 buff/cache`
    - KiB Mem：内存信息
    - 25010324 total：系统总供有25010324KB内存
    - 16740476 free：空闲的内存有16740476KB
    - 8040496 used：被程序占用的内存有8040496KB
    - 229352 buff/cache：磁盘交换或者缓存占用的内存有229352KB
- `KiB Swap: 62434556 total, 62434556 free,        0 used. 16836096 avail Mem`
    - KiB Swap：swap信息
    - 62434556 total：系统总有62434556KBswap空间
    - 62434556 free：空闲的swap空间有62434556KB
    - 0 used：使用的swap空间有0KB
    - 16836096 avail Mem：表示可用于进程下一次分配的物理内存16836096KB
- `PID USER      PR  NI    VIRT    RES    SHR S  %CPU %MEM     TIME+ COMMAND`
    - PID 进程 ID
    - USER 进程所有者的用户名
    - PR 任务优先级，越低越优先
    - NI nice 值。数值越小表示优先级越高，数值越大表示优先级越低
    - VIRT 进程使用的虚拟内存总量），单位：kb。VIRT=SWAP+RES
    - RES 进程使用的、未被换出的物理内存大小，单位：kb。RES=CODE+DATA
    - SHR 共享内存大小，单位：kb
    - S 进程状态。
        - D= 不可中断的睡眠状态
        - R= 运行
        - S= 睡眠
        - T= 跟踪 / 停止
        - Z= 僵尸进程 [进程.md](进程.md)
    - %CPU 上次更新到现在的 CPU 时间占用百分比
    - TIME+ 进程使用的 CPU 时间总计，精确到 1/100 秒
    - COMMAND 命令名 / 命令行
