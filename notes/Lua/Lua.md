## 1. LUA
一种脚本语言，用于以灵活的方式嵌入到应用程序中
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
    name="zsk"
}
print(type(data))

--输出
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
- 表示一个无效值（在条件表达式中相当于false）
- 对于全局变量和 table，nil 还有一个"删除"作用，给全局变量或者 table 表里的变量赋一个 nil 值，等同于把它们删掉

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
- 包含两个值：false和true
- Lua 把 false 和 nil 看作是 false，其他的都为 true，数字 0 也是 true

    ```lua
    if true and 0 then
        print("true")
    end

    if false or nil then
        print("至少有一个是 true")
    else
        print("false 和 nil 都为 false")
    end
    //输出
    true
    false 和 nil 都为 false
    ```
### 2.3. number
- 表示双精度类型的实浮点数

    ```lua
    print(type(2))
    print(type(2.2))
    print(type(0.2))
    print(type(2e+1))
    print(type(0.2e-1))
    print(type(7.8263692594256e-06))
    //输出
    number
    number
    number
    number
    number
    number
    ```

### 2.4. string
- 字符串，由一对双引号或单引号来表示
- 也可以用2 个方括号 "[[]]" 来表示"一块"字符串

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

    //输出
    <html>
    <head></head>
    <body>
        <a href="http://www.runoob.com/">菜鸟教程</a>
    </body>
    </html>
    ```
- 字符串连接使用`..`
    ```lua
    print("a" .. "b")
    print(123 .. 456)
    //输出
    ab
    123456
    ```
- 字符串长度使用`#`
    ```lua
    print(#"sssss")
    //输出
    5
    ```
- 对数字字符串使用`+`会尝试转换成数字
    ```lua
    print("11" + "22")
    //输出
    33
    ```
- 字符串操作api

    ```lua
    --字符串全部转为大写字母
    print(string.upper("test"))--TEST
    --字符串全部转为小写字母。
    print(string.lower("TEST"))--test
    --在字符串中替换。
    print(string.gsub("aaaa", "a", "z", 3))--zzza	3
    --在一个指定的目标字符串中搜索指定的内容(第三个参数为索引),返回其具体位置。不存在则返回 nil。
    print(string.find("Hello Lua user", "Lua", 1))--7	9
    --字符串反转
    print(string.reverse("Lua"))--auL
    --返回一个类似printf的格式化字符串
    print(string.format("the value is:%d", 4))--the value is:4
    --char 将整型数字转成字符并连接， byte 转换字符为整数值(可以指定某个字符，默认第一个字符)。
    print(string.char(97, 98, 99, 100))--abcd
    print(string.byte("ABCD", 4))--68
    --计算字符串长度。
    print(string.len("abc"))--3
    --返回字符串string的n个拷贝
    print(string.rep("abcd", 2))--abcdabcd
    --链接两个字符串
    print("ss" .. "nn")--ssnn
    --字符串截取
    print(string.sub("sourcestr", 1, 3))--sou
    ```

    ```lua
    %c - 接受一个数字, 并将其转化为ASCII码表中对应的字符
    %d, %i - 接受一个数字并将其转化为有符号的整数格式
    %o - 接受一个数字并将其转化为八进制数格式
    %u - 接受一个数字并将其转化为无符号整数格式
    %x - 接受一个数字并将其转化为十六进制数格式, 使用小写字母
    %X - 接受一个数字并将其转化为十六进制数格式, 使用大写字母
    %e - 接受一个数字并将其转化为科学记数法格式, 使用小写字母e
    %E - 接受一个数字并将其转化为科学记数法格式, 使用大写字母E
    %f - 接受一个数字并将其转化为浮点数格式
    %g(%G) - 接受一个数字并将其转化为%e(%E, 对应%G)及%f中较短的一种格式
    %q - 接受一个字符串并将其转化为可安全被Lua编译器读入的格式
    %s - 接受一个字符串并按照给定的参数格式化该字符串
    ```
### 2.5. function
- 由C或Lua编写的函数

    ```lua
    function fun(a, b, c)
        return a, b, c
    end

    value1, value2, value3 = fun(1, 2, 3, 4, 5)
    print(value1, value2, value3)
    -- 输出
    1	2	3
    ```
- 函数是一等公民，可以赋值给变量
    ```lua
    function testFun(tab, fun)
        for k, v in pairs(tab) do
            print(fun(k, v));
        end
    end

    tab = { key1 = "val1", key2 = "val2" };
    testFun(tab,
            function(key, val)
                --匿名函数
                return key .. "=" .. val;
            end
    );
    //输出
    key1=val1
    key2=val2
    ```
- 默认是全局函数，除非加上`local`

    ```lua
    local function test()

    end

    test()
    ```

- 支持多返回值

    ```lua
    local function test()
        return 1, 2
    end

    print(test())
    ```
- 支持变长参数，固定参数必须放在变长参数之前
    ```lua
    function average(...)
        result = 0
        local arg = { ... }    --> arg 为一个表，局部变量
        for i, v in ipairs(arg) do
            result = result + v
        end
        print("总共传入 " .. #arg .. " 个数")
        return result / #arg
    end

    print("平均值为", average(10, 5, 3, 4, 5, 6))
    //输出
    总共传入 6 个数
    平均值为	5.5
    ```
### 2.6. table
- table其实是一个关联数组（类似于map）
    ```lua
    tbl1 = { 1, 2, 3 }
    for k, v in pairs(tbl1) do
        print(k .. " : " .. v)
    end

    print("======================")

    tbl2 = { a = "aa", b = "bb" }
    for k, v in pairs(tbl2) do
        print(k .. " : " .. v)
    end
    print("======================")


    //输出
    1 : 1
    2 : 2
    3 : 3
    ======================
    a : aa
    b : bb
    ======================

    ```
- 数组的索引可以是数字或者字符串或者其它任意类型的值来作数组的索引，但这个值不能是 nil。对 table 的索引使用方括号`[]`或者`.`操作
    ```lua
    tbl3 = {}
    tbl3.first = "first1"
    tbl3.second = "second2"
    print(tbl3[1])
    print(tbl3.first)
    print(tbl3["second"])
    //输出
    nil
    first1
    second2
    ```

- 遍历，默认初始索引一般以 1 开始
    ```lua
    -- 直接初始表
    tbl2 = { "apple", "pear", "orange", "grape" }
    for k, v in pairs(tbl2) do
        print(k .. " : " .. v)
    end
    //输出
    1 : apple
    2 : pear
    3 : orange
    4 : grape
    ```
- 操作table的api

    ```lua
    chars = { "a", "b", "c" }

    -- table->string
    -- 返回 table 连接后的字符串
    print("连接后的字符串 ", table.concat(chars))
    -- 指定连接字符
    print("连接后的字符串 ", table.concat(chars, ", "))
    -- 指定索引来连接 table
    print("连接后的字符串 ", table.concat(chars, ", ", 2, 3))
    print("=================")

    -- table的插入
    -- 在末尾插入
    table.insert(chars, "d")
    print("索引为 4 的元素为 ", chars[4])
    -- 在索引为 2 的键处插入
    table.insert(chars, 2, "e")
    print("索引为 2 的元素为 ", chars[2])
    print("=================")

    -- table的删除
    print("最后一个元素为 ", chars[5])
    table.remove(chars)
    print("移除后最后一个元素为 ", chars[5])
    print("=================")


    --table的排序
    print("排序前")
    for k, v in ipairs(chars) do
        print(k, v)
    end

    table.sort(chars)
    print("排序后")
    for k, v in ipairs(chars) do
        print(k, v)
    end
    print("=================")

    --获取table的长度
    chars[20] = 20
    print(#chars)
    print(table.getn(chars))
    --当我们获取 table 的长度的时候无论是使用 # 还是 table.getn 其都会在索引中断的地方停止计数，而导致无法正确取得 table 的长度。
    --可以使用以下方法来代替：
    local function table_leng(t)
        local leng = 0
        for k, v in pairs(t) do
            leng = leng + 1
        end
        return leng;
    end
    print(table_leng(chars))
    print("=================")

    ```

#### 2.6.1. 数组
- 数组大小不固定，下标是从1开始。

```lua
arr = { "aaa", "bbb", "ccc" }
for index = 1, #arr do
    print(arr[index])
end

-- 输出
aaa
bbb
ccc
```


- 泛型for

```lua
arr = { "aaa", nil, "ccc" }
for i = 1, #arr do
    print(i, arr[i])
end
print("=============")

for i, v in ipairs(arr) do
    print(i, v)
end

print("=============")

for i, v in pairs(arr) do
    print(i, v)
end

-- 输出
1	aaa
2	nil
3	ccc
=============
1	aaa
=============
1	aaa
3	ccc


```

### 2.7. userdata
- 用户自定义数据，通常是C/C++创建的类型
- 可以将任意 C/C++ 的任意数据类型的数据（通常是 struct 和 指针）存储到 Lua 变量中调用
### 2.8. thread
- 协程，coroutine
- 线程可以同时多个运行，而协程任意时刻只能运行一个，并且处于运行状态的协程只有被挂起（suspend）时才会暂停





## 3. 变量
- Lua变量有三种类型：全局变量，局部变量，表中的域

    - Lua中变量全是全局变量，那怕是语句块或是函数里，除非用local显式声明为局部变量。
    - 局部变量的作用域为从声明位置开始到所在语句块结束。
    - 变量的默认值均为nil。

    ```lua
    if true then
        local name = "zsk"
    end

    print(name)


    if true then
        age = 33
    end
    print(age)

    --输出
    nil
    33

    ```
- 可以对多个变量同时赋值

```lua
x, y = 1, 2
x, y = y, x                     -- swap 'x' for 'y'
print(x, y) -- 2 1

-- 变量个数 > 值的个数             按变量个数补足nil
a, b, c = 0, 1
print(a, b, c)             --> 0   1   nil

--  变量个数 < 值的个数             多余的值会被忽略
a, b = 1, 2, 3
print(a, b)               --> 1   2
```

## 4. 注释
```lua
-- 单行注释

--[[
多行注释
--]]
```

## 5. 运算符
### 5.1. 赋值运算符

```lua
a, b = 10, 20

c, d, e = 1, 2
str = "hello" .. "world"
print(a, b, c, d, e, str)

--输出
10	20	1	2	nil	helloworld
```

### 5.2. 算术运算符

```lua
+ 加法
- 减法
* 乘法
/ 除法
% 取余
^ 乘幂
- 负号
```

### 5.3. 关系运算符

```lua
== 等于
～= 不等于
> 大于
< 小于
>= 大于等于
<= 小于等于
```

### 5.4. 逻辑运算符
- and 逻辑与操作符
- or 逻辑或操作符
- not 逻辑非操作符

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
--输出
true
true
true
```
### 5.5. 其它运算符
- .. 连接两个字符串
- #一元运算符，返回字符串或表的长度

```lua
str="hello".."world" -- helloworld
print(#str)--得到10
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
#### 6.2.1. while循环
如果指定的条件为真，那么执行循环
```lua
a = 10
while (a > 0)
do
    print(a)
    a = a - 1
end
--输出
10
9
8
7
6
5
4
3
2
1
```
#### 6.2.2. repeat until
重复执行循环，直到指定的条件为真时退出

```lua
b = 10
repeat
    print(b)
    b = b - 1
until (b < 1)

--输出
10
9
8
7
6
5
4
3
2
1
```

#### 6.2.3. for循环
- 普通for
```lua
for a = 10, 1, -1 do
    print(a)
end
```

- 泛型for

|     |                                   ipairs                                   |                        pairs                         |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| 相同 | 都是能遍历集合（表、数组）                                                   | 都是能遍历集合（表、数组）                             |
| 不同 | 遍历的是value而不是key；遇到nil停止；遇到逆序或者跳过的序号停止；遇到字符串停止 | 遍历所有元素，包括key和value             ；遇到nil继续 |

## 7. 错误处理
### 7.1. 抛出错误
- assert
assert首先检查第一个参数，若没问题，assert不做任何事情；否则，assert以第二个参数作为错误信息抛出

    ```lua
    local function add(a, b)
        assert(type(a) == "number", "a 不是一个数字")
        assert(type(b) == "number", "b 不是一个数字")
        return a + b
    end
    add(10)
    --输出
    lua.exe: module.lua:3: b 不是一个数字
    stack traceback:
    	[C]: in function 'assert'
    	module.lua:3: in function 'add'
    	module.lua:6: in main chunk
    	[C]: ?
    ```
- error
    - `error (message [, level])`
        - 终止正在执行的函数，并返回message的内容作为错误信息
        - Level参数指示获得错误的位置:
            - Level=1[默认]：为调用error位置(文件+行号)
            - Level=2：指出哪个调用error的函数的函数
            - Level=0:不添加错误位置信息
        ```lua
        local function add(a, b)
            error("出错了", 1)
            return a + b
        end
        add(10)
        -- 输出
        lua.exe: module.lua:2: 出错了
        stack traceback:
        	[C]: in function 'error'
        	module.lua:2: in function 'add'
        	module.lua:5: in main chunk
        	[C]: ?
        ```
### 7.2. 处理错误
- pcall

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
    //输出
    一些错误
    ```

- xpcall
由上面的例子可以看出pcall把错误吃掉了，这样不好

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
    //输出
    stack traceback:
    	module.lua:7: in function <module.lua:6>
    	[C]: in function 'error'
    	module.lua:2: in function <module.lua:1>
    	[C]: in function 'xpcall'
    	module.lua:10: in main chunk
    	[C]: ?
    一些错误
    ```
## 8. 模块
### 8.1. 是什么
- 从 Lua 5.1 开始，Lua 加入了标准的模块管理机制
### 8.2. 为什么需要
- 可以把一些公用的代码放在一个文件里，以 API 接口的形式在其他地方调用，有利于代码的重用和降低代码耦合度
### 8.3. 使用
- Lua 的模块是由变量、函数等已知元素组成的 table，因此创建一个模块很简单，就是创建一个 table，然后把需要导出的常量、函数放入其中，最后返回这个 table 就行
#### 8.3.1. 例子
- module.lua

```lua
-- 文件名为 module.lua
-- 定义一个名为 module 的模块
module = {}
 
-- 定义一个常量
module.constant = "这是一个常量"
 
-- 定义一个函数
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
- test_module.lua

```lua
-- test_module.lua 文件
-- module 模块为上文提到到 module.lua
require("module")

print(module.constant)

module.func3()
```


### 8.4. 加载机制
1. 从`LUA_PATH`环境变量中找
2. 从`LUA_CPATH`环境变量中找


## 9. 面向对象

```lua
-- 元类
Rectangle = { area = 0, length = 0, breadth = 0 }

-- 派生类的方法 new
function Rectangle:new (o, length, breadth)
    o = o or {}
    setmetatable(o, self)
    self.__index = self
    self.length = length or 0
    self.breadth = breadth or 0
    self.area = length * breadth;
    return o
end

-- 派生类的方法 printArea
function Rectangle:printArea ()
    print("矩形面积为 ", self.area)
end
-- 创建对象
r = Rectangle:new(nil, 10, 20)
-- 访问属性
print(r.length)
-- 访问成员函数
r:printArea()
```

## 10. 参考
- [Lua 教程 \| 菜鸟教程](https://www.runoob.com/lua/lua-tutorial.html)