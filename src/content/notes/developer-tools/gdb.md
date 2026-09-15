---
title: "3.2 GDB 调试基础"
description: "以断点、单步、调用栈、变量、观察点和线程为主线整理 GDB 的稳定调试模型。"
sourcePath: "Others/软件/gcc.md"
category: "developer-tools"
categoryLabel: "Developer Tools"
topic: "toolchain-debugging"
topicLabel: "3.Toolchain & Debugging"
order: 4
tags: ["GDB", "Debugger", "Debugging"]
updatedAt: "2026-09-15T06:20:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. GDB 的调试模型

GDB 最核心的能力可以分成五类：

1. 控制程序何时停下；
2. 控制程序如何继续执行；
3. 查看当前状态；
4. 修改状态做实验；
5. 检查线程、调用栈和内存。

把命令按用途理解，比背一长串缩写更稳定。

## 2. 启动与参数

```sh
gdb ./app
(gdb) set args --config dev.yaml
(gdb) run
```

也可以 attach 到已有进程，但生产环境 attach 会暂停线程或影响时序，需要谨慎。

## 3. 断点

```gdb
break main
break file.c:42
break worker if count > 100
info breakpoints
disable 2
enable 2
delete 2
```

条件断点适合缩小问题范围，但条件会在命中位置反复求值，大量命中时可能明显拖慢程序。

## 4. 单步执行

```gdb
next
step
continue
finish
until
```

- `next`：执行下一源码行，通常不进入被调函数；
- `step`：进入可调试的函数调用；
- `continue`：运行到下一次停止条件；
- `finish`：运行到当前栈帧返回；
- `until`：继续执行到源码位置向前推进，常用于越过循环，但并不是“退出循环”的专用语义。

## 5. 变量与表达式

```gdb
print value
p/x flags
display counter
info locals
info args
```

`print` 甚至可以调用目标进程中的函数，但这会改变程序状态，不应该把它当作纯观察操作。

## 6. Watchpoint

```gdb
watch counter
rwatch ptr
awatch state
```

观察点关注的是数据访问或变化，而不是执行到哪一行。

硬件观察点数量通常有限；调试器必要时可能采用更昂贵的实现，所以要关注性能影响。

## 7. 调用栈

```gdb
backtrace
frame 3
up
down
info frame
```

崩溃定位时，调用栈通常比“当前源码行”更重要，因为真正的错误可能发生在更早的调用路径中。

多线程问题还可以使用：

```gdb
info threads
thread 4
thread apply all backtrace
```

## 8. 优化带来的错觉

如果程序使用优化编译，可能看到：

- 变量显示为 `<optimized out>`；
- 源码行执行顺序看起来跳动；
- 函数已经内联；
- 某些局部变量根本不存在独立内存位置。

这不是 GDB 一定出错，而是编译器已经改变了机器代码结构。

## 9. GDB 与 IDE Debugger

IDE 的断点、Variables、Call Stack UI 通常只是调试协议的图形化入口。

理解 GDB 的基础模型后，即使 IDE 调试配置失效，也能从命令行判断是程序、符号、路径还是 IDE adapter 的问题。