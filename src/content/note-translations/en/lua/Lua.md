---
title: "1.1 Lua"
description: "Lua language fundamentals covering data types, variables, operators, control flow, error handling, modules, and object-oriented patterns."
translationOf: "lua/Lua"
language: "en"
updatedAt: "2026-09-15T04:15:00Z"
---

## 1. Lua

Lua is a lightweight scripting language designed to be embedded flexibly into applications.

## 2. Data Types

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

-- Output
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

- `nil` represents the absence of a valid value and is treated as false in conditions.
- Assigning `nil` to a global variable or a table field effectively removes that value.

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

- Lua has two Boolean values: `false` and `true`.
- Only `false` and `nil` are falsey. Every other value is truthy, including the number `0`.

```lua
if true and 0 then
    print("true")
end

if false or nil then
    print("at least one value is true")
else
    print("false and nil are both falsey")
end

-- Output
true
false and nil are both falsey
```

### 2.3. number

In older Lua versions such as Lua 5.1, `number` is typically represented as a double-precision floating-point value.

```lua
print(type(2))
print(type(2.2))
print(type(0.2))
print(type(2e+1))
print(type(0.2e-1))
print(type(7.8263692594256e-06))

-- Output
number
number
number
number
number
number
```

### 2.4. string

Strings can be written with double quotes, single quotes, or `[[...]]` for multiline strings.

```lua
html = [[
<html>
<head></head>
<body>
    <a href="http://www.runoob.com/">Lua tutorial</a>
</body>
</html>
]]
print(html)
```

Use `..` to concatenate strings:

```lua
print("a" .. "b")
print(123 .. 456)

-- Output
ab
123456
```

Use `#` to get a string's length:

```lua
print(#"sssss")
-- Output: 5
```

In older Lua versions, arithmetic on numeric strings may coerce them to numbers:

```lua
print("11" + "22")
-- Output: 33
```

Common string APIs include:

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

Common `string.format` specifiers:

```text
%c - Convert a number to the corresponding ASCII character
%d, %i - Signed integer
%o - Octal integer
%u - Unsigned integer
%x - Hexadecimal integer using lowercase letters
%X - Hexadecimal integer using uppercase letters
%e - Scientific notation using lowercase e
%E - Scientific notation using uppercase E
%f - Floating-point number
%g, %G - Use the shorter of scientific or floating-point notation
%q - Format a string so it can safely be read by the Lua parser
%s - String
```

### 2.5. function

Functions can be implemented in C or Lua.

```lua
function fun(a, b, c)
    return a, b, c
end

value1, value2, value3 = fun(1, 2, 3, 4, 5)
print(value1, value2, value3)

-- Output
1  2  3
```

Functions are first-class values and can be passed around like other values:

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

Functions are global by default unless declared with `local`:

```lua
local function test()
end

test()
```

Lua supports multiple return values:

```lua
local function test()
    return 1, 2
end

print(test())
```

Lua also supports variadic arguments. Fixed parameters must appear before `...`:

```lua
function average(...)
    local result = 0
    local arg = { ... }
    for _, v in ipairs(arg) do
        result = result + v
    end
    print("number of arguments: " .. #arg)
    return result / #arg
end

print("average", average(10, 5, 3, 4, 5, 6))
```

### 2.6. table

`table` is Lua's core data structure and can act as both an array and a map.

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

Keys can be numbers, strings, or other non-`nil` values. Table fields can be accessed with `[]` or `.`:

```lua
tbl3 = {}
tbl3.first = "first1"
tbl3.second = "second2"
print(tbl3[1])
print(tbl3.first)
print(tbl3["second"])

-- Output
nil
first1
second2
```

Lua arrays conventionally start at index `1`:

```lua
tbl2 = { "apple", "pear", "orange", "grape" }
for k, v in pairs(tbl2) do
    print(k .. " : " .. v)
end
```

Common table APIs:

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

For tables with holes, do not rely on `#table` as a count of all elements. If every key needs to be counted, iterate with `pairs` instead:

```lua
local function table_length(t)
    local length = 0
    for _ in pairs(t) do
        length = length + 1
    end
    return length
end
```

#### 2.6.1. Arrays

Lua arrays have dynamic size and conventionally start at index `1`.

```lua
arr = { "aaa", "bbb", "ccc" }
for index = 1, #arr do
    print(arr[index])
end
```

`ipairs` visits consecutive integer keys starting from `1` and stops at the first `nil`. `pairs` iterates the key-value pairs in a table without guaranteeing order.

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

- `userdata` lets Lua hold values created by the host language, commonly C or C++.
- It can expose native objects such as structs and pointers to Lua code through bindings.

### 2.8. thread

A Lua `thread` normally refers to a coroutine. Coroutines use cooperative scheduling: only the currently resumed coroutine executes until it yields, suspends, or finishes.

## 3. Variables

Lua variables generally fall into three groups: global variables, local variables, and table fields.

- A variable is global unless it is explicitly declared with `local`.
- A local variable is visible from its declaration to the end of its enclosing block.
- An unassigned variable evaluates to `nil`.

```lua
if true then
    local name = "zsk"
end

print(name)

if true then
    age = 33
end
print(age)

-- Output
nil
33
```

Multiple variables can be assigned at once:

```lua
x, y = 1, 2
x, y = y, x
print(x, y) -- 2  1

a, b, c = 0, 1
print(a, b, c) -- 0  1  nil

a, b = 1, 2, 3
print(a, b) -- 1  2
```

## 4. Comments

```lua
-- Single-line comment

--[[
Multiline comment
--]]
```

## 5. Operators

### 5.1. Assignment

```lua
a, b = 10, 20

c, d, e = 1, 2
str = "hello" .. "world"
print(a, b, c, d, e, str)

-- Output
10  20  1  2  nil  helloworld
```

### 5.2. Arithmetic Operators

```text
+  Addition
-  Subtraction
*  Multiplication
/  Division
%  Modulo
^  Exponentiation
-  Unary negation
```

### 5.3. Relational Operators

```text
==  Equal to
~=  Not equal to
>   Greater than
<   Less than
>=  Greater than or equal to
<=  Less than or equal to
```

### 5.4. Logical Operators

- `and`: logical AND
- `or`: logical OR
- `not`: logical NOT

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

### 5.5. Other Operators

- `..` concatenates strings.
- `#` is the length operator and can be used with strings and sequence-like tables.

```lua
str = "hello" .. "world"
print(#str) -- 10
```

## 6. Control Flow

### 6.1. Conditions

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

### 6.2. Loops

#### 6.2.1. while

A `while` loop continues while its condition is true:

```lua
a = 10
while a > 0 do
    print(a)
    a = a - 1
end
```

#### 6.2.2. repeat until

A `repeat ... until` loop keeps running until its condition becomes true:

```lua
b = 10
repeat
    print(b)
    b = b - 1
until b < 1
```

#### 6.2.3. for

Numeric `for` loop:

```lua
for a = 10, 1, -1 do
    print(a)
end
```

Generic `for` loop:

| Iterator | Behavior |
| --- | --- |
| `ipairs` | Iterates consecutive integer keys from 1 and stops at the first `nil` |
| `pairs` | Iterates table key-value pairs; iteration order is not guaranteed |

## 7. Error Handling

### 7.1. Raising Errors

#### assert

`assert` checks its first argument. If it is truthy, execution continues. Otherwise, Lua raises an error using the second argument as the error message.

```lua
local function add(a, b)
    assert(type(a) == "number", "a is not a number")
    assert(type(b) == "number", "b is not a number")
    return a + b
end

add(10)
```

#### error

`error(message [, level])` terminates the current function and raises an error.

- `level = 1`: the default; report the location where `error` is called.
- `level = 2`: report the caller of the current function.
- `level = 0`: do not add location information.

```lua
local function add(a, b)
    error("an error occurred", 1)
    return a + b
end

add(10)
```

### 7.2. Handling Errors

#### pcall

`pcall` invokes a function in protected mode and returns whether the call succeeded.

```lua
local function add(a, b)
    error("a+b failed", 1)
    return a + b
end

if pcall(add, 1, 2) then
    print("no error")
else
    print("an error occurred")
end
```

#### xpcall

`xpcall` lets the caller provide an error handler, for example to print a stack trace.

```lua
local function add(a, b)
    error("a+b failed", 1)
    return a + b
end

local function errorHandle()
    print(debug.traceback())
end

if xpcall(add, errorHandle, 1, 2) then
    print("no error")
else
    print("an error occurred")
end
```

## 8. Modules

### 8.1. What They Are

Lua modules can be loaded with `require`. A common module pattern is to return a table containing exported values and functions.

### 8.2. Why Use Them

Shared code can be placed in separate files and exposed through APIs, reducing duplication and coupling between modules.

### 8.3. Usage

#### 8.3.1. Example

`module.lua`:

```lua
local module = {}

module.constant = "this is a constant"

function module.func1()
    io.write("this is a public function!\n")
end

local function func2()
    print("this is a private function!")
end

function module.func3()
    func2()
end

return module
```

`test_module.lua`:

```lua
local module = require("module")

print(module.constant)
module.func3()
```

### 8.4. Loading Mechanism

Lua primarily uses these environment variables when resolving modules:

1. `LUA_PATH`: search path for Lua modules.
2. `LUA_CPATH`: search path for C modules.

## 9. Object-Oriented Programming

Lua has no built-in `class` keyword. Object-oriented patterns are commonly built with tables and metatables.

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
    print("rectangle area: ", self.area)
end

r = Rectangle:new(nil, 10, 20)
print(r.length)
r:printArea()
```

## 10. References

- [Lua Tutorial | RUNOOB](https://www.runoob.com/lua/lua-tutorial.html)
