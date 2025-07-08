## 1. Plan9汇编是什么
- 伪汇编
    - 跟汇编一样需要通过汇编器转换成机器指令才能被CPU执行
    - 伪的原因在于：对机器指令反汇编无法生成Go汇编，只能生成平台相关的汇编


## 2. 寄存器
- 通用寄存器
与AMD64机器的寄存器对应关系如下：
![](https://raw.githubusercontent.com/TDoct/images/master/1598282251_20200824103210161_24259.png)
一般前六个用来传递参数，BP和SP用于管理栈顶和栈底
- 虚拟寄存器
没有任何硬件寄存器与之对应，一般用来存放内存地址
![](https://raw.githubusercontent.com/TDoct/images/master/1599394788_20200906201944726_31610.png)
    - SB寄存器
        - Static base pointer: global symbols.
        - 保存程序地址空间的起始地址，即代码区的起始地址
        - **用来定位全局符号**
    - PC寄存器
        - Program counter: jumps and branches.
        - **指向下一条将被执行的指令的地址**
    - SP寄存器
        - Stack pointer: top of stack.
        - 指向当前栈帧的局部变量的开始位置，使用形如 symbol+offset(SP) 的方式。symbol没什么意义
        - **用来引用函数的局部变量**
    - FP寄存器
        - Frame pointer: arguments and locals.
        - 指向调用函数（caller）而不是被调函数（callee）的栈帧，使用形如 symbol+offset(FP) 的方式。symbol没什么意义
        - **用来引用函数的入参**
        -  first_arg+0(FP) 来引用调用者传递进来的第一个参数，用second_arg+8(FP)来引用第二个参数
            - first_arg和second_arg没有意义，类似于注释
            - +8指的是相对于FP寄存器的偏移量



## 3. 指令格式
### 3.1. 操作码
AT&T格式的寄存器操作码一般使用小写且寄存器的名字前面有个%符号，而go汇编使用大写而且寄存器名字前没有%符号

```asm
#AT&T格式
mov %rbp,%rsp

#go汇编格式
MOVQ BP,SP
```
### 3.2. 操作数
AT&T格式是根据寄存器的名字确定操作数是几位的，而go汇编则是在操作码后面带上后缀B(8位)、W(16位)、D(32位)或Q(64位)
## 4. 基本指令

### 4.1. 栈调整
plan9没有提供push和pop，而是通过对SP寄存器进行运算实现

```asm
SUBQ $0x18, SP // 栈是由高地址向低地址生长的，对 SP 做减法相当于为函数分配栈帧
ADDQ $0x18, SP // 栈是由高地址向低地址生长的，对 SP 做加法相当于清除函数栈帧
```
### 4.2. 数据搬运
常数在 plan9 汇编用 $num 表示，可以为负数，默认情况下为十进制。可以用 $0x123 的形式来表示十六进制数
```asm
//搬运的长度是由 MOV 的后缀决定的
MOVB $1, DI      // 1 byte
MOVW $0x10, BX   // 2 bytes
MOVD $1, DX      // 4 bytes
MOVQ $-10, AX     // 8 bytes
```

### 4.3. 计算
类似数据搬运指令，同样可以通过修改指令的后缀来对应不同长度的操作数。例如 ADDQ/ADDW/ADDL/ADDB。
```asm
ADDQ  AX, BX   // BX += AX
SUBQ  AX, BX   // BX -= AX
IMULQ AX, BX   // BX *= AX
```

### 4.4. 条件跳转/无条件跳转
```asm
// 无条件跳转
JMP addr   // 跳转到地址，地址可为代码中的地址，不过实际上手写不会出现这种东西
JMP label  // 跳转到标签，可以跳转到同一函数内的标签位置
JMP 2(PC)  // 以当前指令为基础，向前/后跳转 x 行
JMP -2(PC) // 同上

// 有条件跳转
JNZ target // 如果 zero flag 被 set 过，则跳转
```

## 5. 高级指令
### 5.1. 变量声明
一般是存储在 .rodata 或者 .data 段中的只读值
对应到应用层的话，就是已初始化过的全局的 const、var、static 变量/常量

- DATA指令
```asm
// offset标识相对于符号 symbol 的偏移
DATA    symbol+offset(SB)/width, value
```

- GLOBAL指令
```asm
//相对于DATA多出了flag和变量的总大小
GLOBL divtab(SB), RODATA, $64
```
### 5.2. 函数声明
```asm
// func gogo(buf *gobuf)
// restore state from Gobuf; longjmp
TEXT runtime·gogo(SB), NOSPLIT, $16-8
......
```

- TEXT runtime·gogo(SB)：指明在代码区定义了一个名字叫gogo的全局函数（符号），该函数属于runtime包。
- NOSPLIT：指示编译器不要在这个函数中插入检查栈是否溢出的代码。
- $16-8：数字16说明此函数的栈帧大小为16字节，8说明此函数的参数和返回值一共需要占用8字节内存。
    - 这里没有返回值，有一个参数是指针，占用8Bytes
    - go语言中函数调用的参数和函数返回值都是放在栈上的，而且这部分栈内存是由调用者而非被调用函数负责预留，所以在函数定义时需要说明到底需要在调用者的栈帧中预留多少空间

## 6. 典型函数栈帧
![go栈帧](https://raw.githubusercontent.com/TDoct/images/master/1599397164_20200906205915163_9917.png)
## 7. 如何使用
### 7.1. 确定应用层代码被翻译为哪些 runtime 函数

#### 7.1.1. defer
```go
package asm1

import (
	"fmt"
	"testing"
)

func testDefer() {
	defer func() {
		fmt.Println("defer")
	}()
}

func TestAsm1(t *testing.T) {
	testDefer()
}

```

- go tool compile -S ams1_test.go | grep -i "ams1_test.go:9"
```asm
0x0024 00036 (ams1_test.go:9)   PCDATA  $0, $0
0x0024 00036 (ams1_test.go:9)   PCDATA  $1, $0
0x0024 00036 (ams1_test.go:9)   MOVL    $0, ""..autotmp_1+8(SP)
0x002c 00044 (ams1_test.go:9)   PCDATA  $0, $1
0x002c 00044 (ams1_test.go:9)   LEAQ    "".testDefer.func1·f(SB), AX
0x0033 00051 (ams1_test.go:9)   PCDATA  $0, $0
0x0033 00051 (ams1_test.go:9)   MOVQ    AX, ""..autotmp_1+32(SP)
0x0038 00056 (ams1_test.go:9)   PCDATA  $0, $1
0x0038 00056 (ams1_test.go:9)   LEAQ    ""..autotmp_1+8(SP), AX
0x003d 00061 (ams1_test.go:9)   PCDATA  $0, $0
0x003d 00061 (ams1_test.go:9)   MOVQ    AX, (SP)
0x0041 00065 (ams1_test.go:9)   CALL    runtime.deferprocStack(SB)
0x0046 00070 (ams1_test.go:9)   TESTL   AX, AX
0x0048 00072 (ams1_test.go:9)   JNE     90
0x005a 00090 (ams1_test.go:9)   XCHGL   AX, AX
0x005b 00091 (ams1_test.go:9)   CALL    runtime.deferreturn(SB)
0x0060 00096 (ams1_test.go:9)   MOVQ    64(SP), BP
0x0065 00101 (ams1_test.go:9)   ADDQ    $72, SP
0x0069 00105 (ams1_test.go:9)   RET
0x006a 00106 (ams1_test.go:9)   NOP
0x0000 00000 (ams1_test.go:9)   TEXT    "".testDefer.func1(SB), ABIInternal, $88-0
0x0000 00000 (ams1_test.go:9)   MOVQ    TLS, CX
0x0009 00009 (ams1_test.go:9)   MOVQ    (CX)(TLS*2), CX
0x0010 00016 (ams1_test.go:9)   CMPQ    SP, 16(CX)
0x0014 00020 (ams1_test.go:9)   JLS     134
0x0016 00022 (ams1_test.go:9)   SUBQ    $88, SP
0x001a 00026 (ams1_test.go:9)   MOVQ    BP, 80(SP)
0x001f 00031 (ams1_test.go:9)   LEAQ    80(SP), BP
0x0024 00036 (ams1_test.go:9)   FUNCDATA        $0, gclocals·69c1753bd5f81501d95132d08af04464(SB)
0x0024 00036 (ams1_test.go:9)   FUNCDATA        $1, gclocals·568470801006e5c0dc3947ea998fe279(SB)
0x0024 00036 (ams1_test.go:9)   FUNCDATA        $2, gclocals·bfec7e55b3f043d1941c093912808913(SB)
0x0024 00036 (ams1_test.go:9)   FUNCDATA        $3, "".testDefer.func1.stkobj(SB)
0x0086 00134 (ams1_test.go:9)   PCDATA  $1, $-1
0x0086 00134 (ams1_test.go:9)   PCDATA  $0, $-1
0x0086 00134 (ams1_test.go:9)   CALL    runtime.morestack_noctxt(SB)
0x008b 00139 (ams1_test.go:9)   JMP     0
```

- 再去runtime源码中找`runtime.deferprocStack、runtime.deferreturn`
#### 7.1.2. map

```go
package asm1

import (
	"fmt"
	"testing"
)

func TestAsm2(t *testing.T) {
	testMap()
}

func testMap() {
	var a = map[int]int{}
	a[1] = 1
	fmt.Println(a)
}

```

- go tool compile -S ams2_test.go | grep -i "ams2_test.go:13"
```asm
0x0028 00040 (ams2_test.go:13)  PCDATA  $0, $0
0x0028 00040 (ams2_test.go:13)  PCDATA  $1, $0
0x0028 00040 (ams2_test.go:13)  CALL    runtime.makemap_small(SB)
0x002d 00045 (ams2_test.go:13)  PCDATA  $0, $1
0x002d 00045 (ams2_test.go:13)  MOVQ    (SP), AX
0x0031 00049 (ams2_test.go:13)  PCDATA  $1, $1
0x0031 00049 (ams2_test.go:13)  MOVQ    AX, ""..autotmp_22+64(SP)
```

- 再去runtime源码中找`runtime.makemap_small`

### 7.2. 查看内存是否在堆上分配
#### 7.2.1. new

```go
package asm1

import (
	"fmt"
	"testing"
)

func TestAsm3(t *testing.T) {
	testNew()
}

func testNew() {
	var a = new([]int)
	fmt.Println(a)
}

```

- go tool compile -S asm3_test.go | grep -i "asm3_test.go:13"
```asm
0x0024 00036 (asm3_test.go:13)  PCDATA  $0, $1
0x0024 00036 (asm3_test.go:13)  PCDATA  $1, $0
0x0024 00036 (asm3_test.go:13)  LEAQ    type.[]int(SB), AX
0x002b 00043 (asm3_test.go:13)  PCDATA  $0, $0
0x002b 00043 (asm3_test.go:13)  MOVQ    AX, (SP)
0x002f 00047 (asm3_test.go:13)  CALL    runtime.newobject(SB)
0x0034 00052 (asm3_test.go:13)  PCDATA  $0, $1
0x0034 00052 (asm3_test.go:13)  MOVQ    8(SP), AX
```
- 可以看出调用了`runtime.newobject`，那么就是在堆上分配的
## 8. 参考
- [asmshare/layout\.md at master · cch123/asmshare](https://github.com/cch123/asmshare/blob/master/layout.md)
- [Go 系列文章3 ：plan9 汇编入门](https://xargin.com/plan9-assembly/)