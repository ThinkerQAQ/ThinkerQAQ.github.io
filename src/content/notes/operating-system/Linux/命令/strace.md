---
title: "5.15 strace"
description: "使用 查看进程的系统调用 输出"
sourcePath: "Operating_System/Linux/命令/strace.md"
category: "operating-system"
categoryLabel: "Operating System / Linux"
topic: "performance-diagnostics"
topicLabel: "5.Performance & Diagnostics"
order: 36
tags: ["Operating_System"]
createdAt: "2022-04-04T08:05:26Z"
updatedAt: "2022-04-04T08:07:41Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 使用
查看进程的系统调用
```
strace -f -T -tt -p PID
```

## 输出
![](https://raw.githubusercontent.com/TDoct/images/master/1649059660_20220404160733261_9141.png)
