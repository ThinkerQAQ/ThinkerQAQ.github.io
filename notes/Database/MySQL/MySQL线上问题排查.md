## CPU 100%
1. 使用 `show processlist`列出所有进程，看看里面跑的 session 情况，是不是有消耗资源的 sql 在运行
2. 找出消耗高的 sql，然后 kill 掉这些线程；通过`explain`分析sq