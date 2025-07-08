

## 1. 栈是什么
- 空间小，数据存放时间较短暂。栈在高地址，从高地址向低地址增长
- 分配：函数调用自动分配
- 回收：函数返回自动回收

## 2. Golang栈的特点

### 2.1. 动态扩容
- go runtime不是给每个goroutine分配固定的空间，而是需要的动态分配栈空间
- 创建goroutine的时候会分配一个8KB的内存给goroutine的栈使用，用完了咋办
    - 怎么检测用完？go函数的开头有一个检测代码
    - 如何扩容？参考连续栈和分段栈

### 2.2. 连续栈 vs 分段栈
- Go 1.3 版本前使用的栈结构是分段栈，之后使用的是连续栈
- 分段栈：
    - 扩容：调用 runtime.morestack 和 runtime.newstack创建一个新的栈空间，多个栈空间会通过双向链表串起来
    - 缩容：调用lessstack
    - 问题：热分裂。比如循环中调用函数，又扩容又缩容
- 连续栈：
    - 扩容：
        1. 调用runtime.newstack初始化一片比旧栈大两倍的新栈
        2. 调用runtime.copystack将旧栈中的所有内容复制到新的栈中
        3. 将指向旧栈对应变量的指针重新指向新栈
        4. 调用runtime.stackfree销毁并回收旧栈的内存空间

## 3. 参考
- [Go语言的栈空间管理 \- 知乎](https://zhuanlan.zhihu.com/p/28484133)
- [Go 语言内存管理三部曲（二）解密栈内存管理 \- InfoQ 写作平台](https://xie.infoq.cn/article/530c735982a391604d0eebe71)
- [连续栈 · 深入解析Go](https://tiancaiamao.gitbooks.io/go-internals/content/zh/03.5.html)