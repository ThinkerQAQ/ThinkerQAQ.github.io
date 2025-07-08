## 1. 什么是Flush
- 当内存数据页跟磁盘数据页内容不一致的时候，我们称这个内存页为“脏页”。内存数据写入到磁盘后，内存和磁盘上的数据页的内容就一致了，称为“干净页”
- Flush就是把脏页刷入磁盘
## 2. Flush触发时机
- 当出现几种情况的时候会把
    - redo-log写满了（尽量避免，会阻塞住所有的更新）
    - 内存满了
    - MySQL认为系统空间的时候（没啥影响）
    - MySQL正常关闭的时候（没啥影响）
## Flush的影响
- MySQL性能会抖动一下
## 3. InnoDB刷脏页的控制策略
- 将`innodb_io_capacity`参数设置为` fio -filename=$filename -direct=1 -iodepth 1 -thread -rw=randrw -ioengine=psync -bs=16k -size=500M -numjobs=10 -runtime=10 -group_reporting -name=mytest 
`