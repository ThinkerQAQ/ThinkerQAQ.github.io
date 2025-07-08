## DMA
![](https://raw.githubusercontent.com/TDoct/images/master/1598181067_20200622230324158_21545.png)

1. CPU发送指令给DMA
2. CPU搞其他事去了
2. DMA从硬盘中读取文件
3. DMA把文件读到内存中
4. DMA以中断的形式通知CPU文件读完了

CPU和DMA轮流占有总线