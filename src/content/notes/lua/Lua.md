---
title: "1.1 Lua"
description: "Lua 是一种适合嵌入应用程序的轻量脚本语言。本笔记整理 Lua 的数据类型、变量、运算符、流程控制、错误处理、模块和面向对象基础。"
sourcePath: "Lua/Lua.md"
category: "lua"
categoryLabel: "Lua"
topic: "__root"
topicLabel: "1.Language"
order: 1
tags: ["Lua"]
updatedAt: "2026-09-08T13:53:51Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. Lua

Lua 是一种轻量脚本语言，适合以灵活的方式嵌入到应用程序中。

## 2. 数据类型

```lua
print(type(nil))
print(type(1))
print(type(1.1))
print(type("test"))
print(type(true))
print(type(type))
print(type({}))

data = {
    name = "zsk"
}
print(type(data))

-- 输出
nil
number
number
string
boolean
function
table
table
```

### 2.1. nil

- 表示一个无效值，在条件表达式中相当于 `false`。
- 对于全局变量和 table，赋值为 `nil` 还可以理解为删除对应值。

```lua
tab1 = { key1 = "val1", key2 = "val2", "val3" }
for k, v in pairs(tab1) do
    print(k .. " - " .. v)
end

tab1.key1 = nil
for k, v in pairs(tab1) do
    print(k .. " - " .. v)
end
```

### 2.2. boolean

- 包含 `false` 和 `true` 两个值。
- Lua 只有 `false` 和 `nil` 被视为假，其他值都为真，包括数字 `0`。

```lua
if true and 0 then
    print("true")
end

if false or nil then
    print("至少有一个是 true")
else
    print("false 和 nil 都为 false")
end

-- 输出
true
false 和 nil 都为 false
```

### 2.3. number

在 Lua 5.1 这类较早版本中，`number` 通常使用双精度浮点数表示。

```lua
print(type(2))
print(type(2.2))
print(type(0.2))
print(type(2e+1))
print(type(0.2e-1))
print(type(7.8263692594256e-06))

-- 输出
number
number
number
number
number
number
```

### 2.4. string

字符串可以由双引号、单引号表示，也可以使用 `[[...]]` 表示多行字符串。

```lua
html = [[
<html>
<head></head>
<body>
    <a href="http://www.runoob.com/">菜鸟教程</a>
</body>
</html>
]]
print(html)
```

字符串连接使用 `..`：

```lua
print("a" .. "b")
print(123 .. 456)

-- 输出
ab
123456
```

字符串长度使用 `#`：

```lua
print(#"sssss")
-- 输出：5
```

数字字符串参与算术运算时，旧版本 Lua 会尝试将其转换为数字：

```lua
print("11" + "22")
-- 输出：33
```

常见字符串 API：

```lua
print(string.upper("test"))                    -- TEST
print(string.lower("TEST"))                    -- test
print(string.gsub("aaaa", "a", "z", 3))      -- zzza  3
print(string.find("Hello Lua user", "Lua", 1)) -- 7  9
print(string.reverse("Lua"))                    -- auL
print(string.format("the value is:%d", 4))      -- the value is:4
print(string.char(97, 98, 99, 100))              -- abcd
print(string.byte("ABCD", 4))                   -- 68
print(string.len("abc"))                        -- 3
print(string.rep("abcd", 2))                    -- abcdabcd
print("ss" .. "nn")                            -- ssnn
print(string.sub("sourcestr", 1, 3))            -- sou
```

`string.format` 常见格式：

```text
%c - 将数字转换为 ASCII 对应字符
%d, %i - 有符号整数
%o - 八进制整数
%u - 无符号整数
%x - 十六进制整数（小写）
%X - 十六进制整数（大写）
%e - 科学计数法（小写 e）
%E - 科学计数法（大写 E）
%f - 浮点数
%g, %G - 在科学计数法和浮点格式中选择较短的一种
%q - 将字符串转换为可安全被 Lua 编译器读取的格式
%s - 字符串
```

### 2.5. function

函数可以由 C 或 Lua 编写。

```lua
function fun(a, b, c)
    return a, b, c
end

value1, value2, value3 = fun(1, 2, 3, 4, 5)
print(value1, value2, value3)

-- 输出
1  2  3
```

函数是一等公民，可以作为值传递：

```lua
function testFun(tab, fun)
    for k, v in pairs(tab) do
        print(fun(k, v))
    end
end

tab = { key1 = "val1", key2 = "val2" }
testFun(tab, function(key, val)
    return key .. "=" .. val
end)
```

默认声明的函数是全局函数，使用 `local` 可以声明局部函数：

```lua
local function test()
end

test()
```

Lua 支持多返回值：

```lua
local function test()
    return 1, 2
end

print(test())
```

也支持变长参数，固定参数需要位于变长参数之前：

```lua
function average(...)
    local result = 0
    local arg = { ... }
    for _, v in ipairs(arg) do
        result = result + v
    end
    print("总共传入 " .. #arg .. " 个数")
    return result / #arg
end

print("平均值为", average(10, 5, 3, 4, 5, 6))
```

### 2.6. table

`table` 是 Lua 最核心的数据结构，可以同时承担数组、映射等角色。

```lua
tbl1 = { 1, 2, 3 }
for k, v in pairs(tbl1) do
    print(k .. " : " .. v)
end

tbl2 = { a = "aa", b = "bb" }
for k, v in pairs(tbl2) do
    print(k .. " : " .. v)
end
```

索引可以是数字、字符串或其他非 `nil` 值，可以使用 `[]` 或 `.` 访问：

```lua
tbl3 = {}
tbl3.first = "first1"
tbl3.second = "second2"
print(tbl3[1])
print(tbl3.first)
print(tbl3["second"])

-- 输出
nil
first1
second2
```

Lua 数组习惯从索引 `1` 开始：

```lua
tbl2 = { "apple", "pear", "orange", "grape" }
for k, v in pairs(tbl2) do
    print(k .. " : " .. v)
end
```

常见 table API：

```lua
chars = { "a", "b", "c" }

print(table.concat(chars))
print(table.concat(chars, ", "))
print(table.concat(chars, ", ", 2, 3))

table.insert(chars, "d")
table.insert(chars, 2, "e")

table.remove(chars)
table.sort(chars)

for k, v in ipairs(chars) do
    print(k, v)
end
```

对于存在空洞的 table，`#table` 的结果不应当被依赖来计算元素总数。需要统计所有键时，可以遍历 `pairs`：

```lua
local function table_length(t)
    local length = 0
    for _ in pairs(t) do
        length = length + 1
    end
    return length
end
```

#### 2.6.1. 数组

数组大小不固定，通常从下标 `1` 开始。

```lua
arr = { "aaa", "bbb", "ccc" }
for index = 1, #arr do
    print(arr[index])
end
```

`ipairs` 按从 `1` 开始的连续整数索引遍历，遇到第一个 `nil` 停止；`pairs` 遍历 table 中的键值对，顺序不保证。

```lua
arr = { "aaa", nil, "ccc" }

for i, v in ipairs(arr) do
    print(i, v)
end

print("=============")

for i, v in pairs(arr) do
    print(i, v)
end
```

### 2.7. userdata

- `userdata` 用于承载由宿主语言（通常是 C/C++）创建的数据。
- 可以把 C/C++ 中的结构体、指针等对象封装后暴露给 Lua 使用。

### 2.8. thread

Lua 的 `thread` 通常指 coroutine（协程）。协程采用协作式切换，同一时刻只有当前恢复执行的协程在运行，直到它主动让出执行权、挂起或结束。

## 3. 变量

Lua 变量主要包括全局变量、局部变量和 table 中的字段。

- 未使用 `local` 声明的变量默认是全局变量。
- 局部变量作用域从声明位置开始，到所在语句块结束。
- 未赋值变量的默认值为 `nil`。

```lua
if true then
    local name = "zsk"
end

print(name)

if true then
    age = 33
end
print(age)

-- 输出
nil
33
```

可以同时给多个变量赋值：

```lua
x, y = 1, 2
x, y = y, x
print(x, y) -- 2  1

a, b, c = 0, 1
print(a, b, c) -- 0  1  nil

a, b = 1, 2, 3
print(a, b) -- 1  2
```

## 4. 注释

```lua
-- 单行注释

--[[
多行注释
--]]
```

## 5. 运算符

### 5.1. 赋值

```lua
a, b = 10, 20

c, d, e = 1, 2
str = "hello" .. "world"
print(a, b, c, d, e, str)

-- 输出
10  20  1  2  nil  helloworld
```

### 5.2. 算术运算符

```text
+  加法
-  减法
*  乘法
/  除法
%  取余
^  乘幂
-  负号
```

### 5.3. 关系运算符

```text
==  等于
~=  不等于
>   大于
<   小于
>=  大于等于
<=  小于等于
```

### 5.4. 逻辑运算符

- `and`：逻辑与
- `or`：逻辑或
- `not`：逻辑非

```lua
if true and true then
    print(true)
end

if true or false then
    print(true)
end

if not name then
    print(true)
end
```

### 5.5. 其他运算符

- `..`：连接字符串。
- `#`：长度运算符，可用于字符串，也可用于满足连续序列条件的 table。

```lua
str = "hello" .. "world"
print(#str) -- 10
```

## 6. 流程控制

### 6.1. 条件

```lua
local name
if not name then
    print("name is nil")
    name = "test"
end

if name ~= nil then
    print(name)
end
```

### 6.2. 循环

#### 6.2.1. while

指定条件为真时持续执行：

```lua
a = 10
while a > 0 do
    print(a)
    a = a - 1
end
```

#### 6.2.2. repeat until

重复执行，直到条件为真时退出：

```lua
b = 10
repeat
    print(b)
    b = b - 1
until b < 1
```

#### 6.2.3. for

普通 `for`：

```lua
for a = 10, 1, -1 do
    print(a)
end
```

泛型 `for`：

| 方法 | 行为 |
| --- | --- |
| `ipairs` | 从索引 1 开始遍历连续整数键，遇到第一个 `nil` 停止 |
| `pairs` | 遍历 table 中的键值对，遍历顺序不保证 |

## 7. 错误处理

### 7.1. 抛出错误

#### assert

`assert` 首先检查第一个参数。如果为真则继续执行；否则以第二个参数作为错误信息抛出错误。

```lua
local function add(a, b)
    assert(type(a) == "number", "a 不是一个数字")
    assert(type(b) == "number", "b 不是一个数字")
    return a + b
end

add(10)
```

#### error

`error(message [, level])` 会终止当前函数并抛出错误。

- `level = 1`：默认，错误位置为调用 `error` 的位置。
- `level = 2`：错误位置指向调用当前函数的位置。
- `level = 0`：不附加错误位置信息。

```lua
local function add(a, b)
    error("出错了", 1)
    return a + b
end

add(10)
```

### 7.2. 处理错误

#### pcall

`pcall` 以保护模式调用函数，并通过返回值告诉调用方执行是否成功。

```lua
local function add(a, b)
    error("a+b出错了", 1)
    return a + b
end

if pcall(add, 1, 2) then
    print("没有错误")
else
    print("一些错误")
end
```

#### xpcall

`xpcall` 可以在错误发生时调用指定的错误处理函数，例如输出堆栈信息。

```lua
local function add(a, b)
    error("a+b出错了", 1)
    return a + b
end

local function errorHandle()
    print(debug.traceback())
end

if xpcall(add, errorHandle, 1, 2) then
    print("没有错误")
else
    print("一些错误")
end
```

## 8. 模块

### 8.1. 是什么

Lua 可以通过 `require` 加载模块。常见做法是由模块文件返回一个包含变量和函数的 table。

### 8.2. 为什么需要

把公共代码放入独立文件，通过 API 的形式复用，可以降低代码重复和模块之间的耦合。

### 8.3. 使用

#### 8.3.1. 例子

`module.lua`：

```lua
local module = {}

module.constant = "这是一个常量"

function module.func1()
    io.write("这是一个公有函数！\n")
end

local function func2()
    print("这是一个私有函数！")
end

function module.func3()
    func2()
end

return module
```

`test_module.lua`：

```lua
local module = require("module")

print(module.constant)
module.func3()
```

### 8.4. 加载机制

Lua 的模块搜索路径主要由以下环境变量控制：

1. `LUA_PATH`：Lua 模块搜索路径。
2. `LUA_CPATH`：C 模块搜索路径。

## 9. 面向对象

Lua 没有内建的 class 关键字，通常使用 table 和 metatable 组合出面向对象风格。

```lua
Rectangle = { area = 0, length = 0, breadth = 0 }

function Rectangle:new(o, length, breadth)
    o = o or {}
    setmetatable(o, self)
    self.__index = self
    o.length = length or 0
    o.breadth = breadth or 0
    o.area = o.length * o.breadth
    return o
end

function Rectangle:printArea()
    print("矩形面积为 ", self.area)
end

r = Rectangle:new(nil, 10, 20)
print(r.length)
r:printArea()
```

## 10. 参考

- [Lua 教程 | 菜鸟教程](https://www.runoob.com/lua/lua-tutorial.html)
