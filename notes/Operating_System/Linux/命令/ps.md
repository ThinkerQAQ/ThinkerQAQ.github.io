
#### 1. 使用
- 正常使用
```java
ps aux
```

- 显示线程
```
ps -eLf
```

- 显示线程数
```
ps -mq PID
```

#### 2. 输出
- ![](https://raw.githubusercontent.com/TDoct/images/master/1618732041_20210418153041367_24465.png)
#### 3. 解析
- USER：运行进程的用户
- PID：进程号
- %CPU：占用的CPU百分比
- %MEM：占用的内存百分比
- VSZ：占用的虚拟内存，KB
- RSS：占用的物理内存，KB
- TTY：运行在哪个终端上，如果跟终端无关，那么显示？
    - tty1-tty6是本机登录，pts/0等等是网络登录
- STAT：状态
    - R：运行中
    - S：休眠
    - T：暂停。比如ctrl+Z
    - Z：僵尸
    - D：不可中断
    - 附加
        - s：多进程
        - l：多线程
        - +：前台
        - <：高优先级
        - N：低优先级
- START：启动时间
- TIME：运行时长
- COMMAND：进程名