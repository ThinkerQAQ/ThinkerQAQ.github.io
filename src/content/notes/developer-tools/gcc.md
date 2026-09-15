---
title: "1.2 GCC"
description: "Windows / MSYS2 下安装 GCC，并记录 GDB 的常用调试命令。"
sourcePath: "Others/软件/gcc.md"
category: "developer-tools"
categoryLabel: "Developer Tools"
topic: "software-tools"
topicLabel: "1.Software Tools"
order: 2
tags: ["Developer Tools", "GCC", "GDB", "MSYS2"]
updatedAt: "2026-09-15T11:40:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 安装
### 1.1. 安装Msys2
[msys2.md](/notes/developer-tools/msys2/)

### 1.2. 安装gcc

在当前 MSYS2 中，如果使用 UCRT64 环境，可以安装对应工具链：

```sh
pacman -Syu
pacman -S --needed mingw-w64-ucrt-x86_64-toolchain mingw-w64-ucrt-x86_64-gdb
```

原笔记的 `pacman -S base-devel gcc gdb` 更偏向 MSYS 环境本身；编译原生 Windows 程序时应使用所选环境对应的工具链包。

## 2. gdb

### 2.1. 运行
- `run` / `r`：运行程序，遇到断点后停止。
- `continue` / `c`：继续执行，到下一个断点处或程序结束。
- `next` / `n`：单步执行；遇到函数调用时通常不进入函数体。
- `step` / `s`：单步执行；遇到可调试的函数调用时进入函数体。
- `until`：继续运行到当前源代码位置之后的指定位置，常用于快速走出循环；具体行为取决于当前位置和参数。
- `until 行号`：运行到指定源代码位置。
- `finish`：运行到当前函数返回。
- `call 函数(参数)`：在调试上下文中调用可见函数，例如 `call gdb_test(55)`。
- `quit` / `q`：退出 GDB。

### 2.2. 设置断点
- `break n` / `b n`：在第 n 行设置断点。
- `break file.cpp:578`：在指定文件和行设置断点。
- `break fn1 if a > b`：设置条件断点。
- `break func`：在函数入口处设置断点。
- `delete n`：删除编号为 n 的断点。
- `disable n`：停用断点。
- `enable n`：启用断点。
- `clear n`：清除指定源代码行的断点。
- `info breakpoints` / `info b`：显示断点。
- `delete breakpoints`：删除全部断点。

### 2.3. 查看源代码
- `list` / `l`：列出源代码。
- `list 行号`：显示指定行附近的源码。
- `list 函数名`：显示指定函数附近的源码。
- 不带参数再次执行 `list`：继续显示后续源码。

### 2.4. 打印表达式
- `print 表达式` / `p 表达式`：求值并打印表达式。
- `print a`：打印变量 `a`。
- `print ++a`：执行表达式并打印结果；注意这会修改被调试程序状态。
- `print name`：打印变量。
- `print gdb_test(22)`：调用函数并打印结果。
- `display 表达式`：每次暂停时自动显示表达式。
- `watch 表达式`：设置观察点；表达式值变化时暂停。是否能使用硬件观察点取决于平台和资源。
- `whatis`：查询变量或函数的类型。
- `info functions`：查看函数。
- `info locals`：显示当前栈帧的局部变量。

### 2.5. 查询运行信息
- `where` / `bt` / `backtrace`：显示当前调用栈。
- `up` / `down`：切换当前栈帧。
- `set args 参数`：设置程序运行参数。
- `show args`：查看运行参数。
- `info program`：查看程序运行状态、进程信息和停止原因。

## 3. 参考
- [MSYS2](https://www.msys2.org/)
- [GDB Documentation](https://sourceware.org/gdb/documentation/)
- [GCC Online Documentation](https://gcc.gnu.org/onlinedocs/)
