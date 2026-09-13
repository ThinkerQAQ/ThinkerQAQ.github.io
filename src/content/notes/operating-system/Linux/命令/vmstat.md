---
title: "5.4 vmstat"
description: "1. 使用 2. 结果 3. 解析 - buffer和cache：跟传统意义上的buffer和cache不同。内存管理.md - buffer：文件元数据 - cache：文件数据 - procs - r：运行和等待CPU时间片的进程数。一般不超过cpu总核数的两倍 - b：等待资源的进程数，比如等"
sourcePath: "Operating_System/Linux/命令/vmstat.md"
category: "operating-system"
categoryLabel: "Operating System / Linux"
topic: "performance-diagnostics"
topicLabel: "5.Performance & Diagnostics"
order: 25
tags: ["Operating_System"]
createdAt: "2021-04-18T09:48:05Z"
updatedAt: "2022-08-29T07:24:20Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 使用
```sh
#每隔2s采样一次，总共采样3次
vmstat -n 2 3
```
## 2. 结果
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191231205131.png)
## 3. 解析
- buffer和cache：跟传统意义上的buffer和cache不同。[内存管理.md](/notes/operating-system/Linux/%E5%86%85%E5%AD%98/%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/)
    - buffer：文件元数据
    - cache：文件数据
- procs
    - r：运行和等待CPU时间片的进程数。一般不超过cpu总核数的两倍
    - b：等待资源的进程数，比如等待磁盘IO、网络IO等
- cpu
    - us：用户进程消耗cpu时间的百分比。长期>50%说明需要优化程序
    - sy：内核进程消耗cpu时间的百分比
    - us+sy > 80%则说明cpu不足
