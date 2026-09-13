---
title: "5.10 ulimit"
description: "可以设置 当前shell 的 当前用户 的 所有进程 的资源 ulimit 有软限制和硬限制之分： - 软限制：任何进程都可以修改软限制，但是软限制不能超过硬限制； - 硬限制：普通进程可以降低硬限制，只有 root 进程可以提高硬限制；"
sourcePath: "Operating_System/Linux/命令/ulimit.md"
category: "operating-system"
categoryLabel: "Operating System / Linux"
topic: "performance-diagnostics"
topicLabel: "5.Performance & Diagnostics"
order: 31
tags: ["Operating_System"]
createdAt: "2021-04-18T09:53:28Z"
updatedAt: "2021-04-18T09:53:32Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
可以设置**当前shell**的**当前用户**的**所有进程**的资源

ulimit 有软限制和硬限制之分：

- 软限制：任何进程都可以修改软限制，但是软限制不能超过硬限制；
- 硬限制：普通进程可以降低硬限制，只有 root 进程可以提高硬限制；
