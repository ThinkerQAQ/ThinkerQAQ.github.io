---
title: "5.15 List与Array的转换"
description: "1. Array转List 2. List转Array"
sourcePath: "Java/JDK/List/List与Array的转换.md"
category: "java"
categoryLabel: "Java"
topic: "JDK"
topicLabel: "5.JDK"
order: 137
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-22T08:45:40Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. Array转List

```java
//转换成不可改变的list

//首先copy原有的array
//然后转成list
//最后转换成不可变list
Collections.unmodifiableList(Arrays.asList(Arrays.copyOf(arrays, arrays.length)));

//转换成可变的list
Arrays.stream(Arrays.copyOf(arrays, arrays.length)).collect(Collectors.toList());

```

## 2. List转Array

```java
list.toArray();
```
