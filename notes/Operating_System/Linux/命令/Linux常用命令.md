[toc]
 

## 1. 进程
### 1.1. top

- [top.md](top.md)

### 1.2. vmstat
- [vmstat.md](vmstat.md)

### 1.3. ps
- [ps.md](ps.md)
### 1.4. pstree
- [pstree.md](pstree.md)
### 1.5. ulimit
- [ulimit.md](ulimit.md)
### 1.6. systemd
- [systemd.md](systemd.md)
### 1.7. pidstat
[pidstat.md](pidstat.md)

### 1.8. perf
[perf.md](perf.md)
## 2. 内存
### 2.1. free
- [free.md](free.md)
## 3. 磁盘
### 3.1. df
- [df.md](df.md)
### 3.2. iostat

- [iostat.md](iostat.md)

### 3.3. lsof
[lsof.md](lsof.md)

### 3.4. strace
[strace.md](strace.md)

### 3.5. chroot
[chroot.md](chroot.md)
### 3.6. 文本
- cat命令可以一次显示整个文件，如果文件比较大，使用不是很方便；
- more命令可以让屏幕在显示满一屏幕时暂停，按空格往前翻页，按b往后翻页。
- less命令也可以分页显示文件，和more命令的区别就在于：
    - 支持上下键卷动屏幕、查找。
    - 不需要在一开始就读取整个文件，打开大文件时比more、vim更快。
- head命令用于查看文件的前n行。
- tail命令用于查看文件的后n行。加上-f命令，查看在线日志非常方便，可以打印最新增加的日志。
    - tail -f grep --color -A xxx -B xxx
### 3.7. 复制
#### 3.7.1. scp
[scp.md](scp.md)
#### 3.7.2. rsync
[rsync.md](rsync.md)
## 4. 网络
### 4.1. ifstat
- [ifstat.md](ifstat.md)

### 4.2. netstat
- [netstat.md](netstat.md)

### 4.3. ifconfig
- [ifconfig.md](ifconfig.md)
### 4.4. 测试主机连通性
- curl测试HTTP
```bash
curl https://www.baidu.com:443
```
- telnet测试TCP
```bash
telnet www.baidu.com 80
```


### 4.5. tracerout
[traceroute.md](traceroute.md)
### 4.6. dig
[dig.md](dig.md)
### 4.7. nslookup
[nslookup.md](nslookup.md)

### 4.8. nethogs
[nethogs.md](nethogs.md)

### 4.9. sar
[sar.md](sar.md)
### 4.10. 抓包
- [tcpdump.md](tcpdump.md)






## 5. 参考
- [linux 性能瓶颈排查\_xiongyouqiang的博客\-CSDN博客](https://blog.csdn.net/xiongyouqiang/article/details/79364323)
- [Linux top命令中CPU信息的详解（转） \- 奋斗终生 \- 博客园](https://www.cnblogs.com/ajianbeyourself/p/8185973.html)
- [工具参考篇 — Linux Tools Quick Tutorial](https://linuxtools-rst.readthedocs.io/zh_CN/latest/tool/index.html)
- [Linux ulimit详解 \| Otokaze's Blog](https://www.zfl9.com/ulimit.html)
- [linux最大文件句柄数量总结 \- 樵夫后院 \- ITeye博客](https://www.iteye.com/blog/jameswxx-2096461)
- [cat less more head tail命令比较\_运维\_楚兴\-CSDN博客](https://blog.csdn.net/foreverling/article/details/82557939)
- [vmstat显示的buffer和cache的区别\_运维\_技术风向标\-CSDN博客](https://blog.csdn.net/iteye_2535/article/details/81924537)
- [008 top命令详解 Linux基础命令\(4\)\_哔哩哔哩 \(゜\-゜\)つロ 干杯~\-bilibili](https://www.bilibili.com/video/BV1wg4y1i7u4)