---
title: "4.1 enum"
description: "1. 是什么 用来定义枚举值，是个语法糖，底层通过Enum类实现 2. 如何使用 3. 源码分析 3.1. Enum"
sourcePath: "Java/Java_Keyword/enum.md"
category: "java"
categoryLabel: "Java"
topic: "Java_Keyword"
topicLabel: "4.Java_Keyword"
order: 119
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-02-11T14:08:53Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 1. 是什么

用来定义枚举值，是个语法糖，底层通过Enum类实现

## 2. 如何使用

```java
enum Color
{RED, BLUE, GREEN}



class Test
{
    public static void main(String[] args)
    {
        System.out.println(Color.RED.name());//RED
        System.out.println(Color.RED.ordinal());//0
        System.out.println(Color.RED);//RED
        for (Color value : Color.values())
        {
            System.out.println(value);
        }
        System.out.println(Color.valueOf(Color.RED.name()));//RED

    }
}
```


## 3. 源码分析


### 3.1. Enum
```java
//抽象类无法实例化。
public abstract class Enum<E extends Enum<E>>
        implements Comparable<E>, Serializable {//可序列化、可比较
        //枚举的名字，可以通过name()访问
        private final String name;
        //枚举的顺序，从0开始。可以通过ordinal()访问
        private final int ordinal;

}

```
