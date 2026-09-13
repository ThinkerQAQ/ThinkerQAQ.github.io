---
title: "4.2 switch"
description: "1. 支持的功能 对byte、short、int、char、String、enum支持条件分支 2. 源码分析 2.1. int 编译之后使用idea查看class文件发现没有变化，说明int是直接比较整数值 2.2. char - 反编译之后 比较的是char的ascii码 2.3. String"
sourcePath: "Java/Java_Keyword/switch.md"
category: "java"
categoryLabel: "Java"
topic: "Java_Keyword"
topicLabel: "4.Java_Keyword"
order: 120
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-03-03T02:20:24Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 1. 支持的功能

对byte、short、int、char、String、enum支持条件分支

## 2. 源码分析


### 2.1. int
```java
int a = 5;
switch (a)
{
    case 1:
        System.out.println(1);
        break;
    case 5:
        System.out.println(5);
        break;
    default:
        break;
}
```

编译之后使用idea查看class文件发现没有变化，说明int是直接比较整数值

### 2.2. char
```java
char a = 'b';
switch (a)
{
    case 'a':
        System.out.println('a');
        break;
    case 'b':
        System.out.println('b');
        break;
    default:
        break;
}
```

- 反编译之后
```java
char a = 98;
switch(a) {
case 97:
    System.out.println('a');
    break;
case 98:
    System.out.println('b');
}
```

比较的是char的ascii码

### 2.3. String
```java
String str = "world";
switch (str)
{
    case "hello":
        System.out.println("hello");
        break;
    case "world":
        System.out.println("world");
        break;
    default:
        break;
}
```

- 反编译之后

```java
String str = "world";
byte var3 = -1;
switch(str.hashCode()) {
case 99162322:
    if (str.equals("hello")) {
        var3 = 0;
    }
    break;
case 113318802:
    if (str.equals("world")) {
        var3 = 1;
    }
}

switch(var3) {
case 0:
    System.out.println("hello");
    break;
case 1:
    System.out.println("world");
}
```

首先比较String的hashCode，然后再使用equals方法比较是否相等
