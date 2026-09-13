---
title: "5.21 TreeSet"
description: "1. 是什么 无序、不重复的集合，使用TreeMap实现 2. 使用 3. 源码分析 3.1. 构造方法 3.2. 属性 3.3. 其他方法 调用的TreeMap的方法，效率O（logN） 4. 总结 底层使用TreeMap实现，value使用newObject作为占位符"
sourcePath: "Java/JDK/Set/TreeSet.md"
category: "java"
categoryLabel: "Java"
topic: "JDK"
topicLabel: "5.JDK"
order: 143
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-02-17T05:59:31Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. 是什么

无序、不重复的集合，使用TreeMap实现

## 2. 使用

```java
public class TreeSetTest
{
    public static void main(String[] args)
    {
        TreeSet<Integer> set = new TreeSet<>();
        set.add(1);
        set.add(2);
        set.remove(2);
        System.out.println(set.contains(1));
        System.out.println(set.contains(2));
        System.out.println(set.contains(3));
    }
}
```


## 3. 源码分析


### 3.1. 构造方法
```java
public TreeSet() {
	//底层使用TreeMap实现
    this(new TreeMap<E,Object>());
}

```

### 3.2. 属性
```java
public class TreeSet<E> extends AbstractSet<E>
    implements NavigableSet<E>, Cloneable, java.io.Serializable
{

	//通过key的顺序访问的map接口
    private transient NavigableMap<E,Object> m;

	//作为map的value的占位符
    private static final Object PRESENT = new Object();
}
```


### 3.3. 其他方法
调用的TreeMap的方法，效率O（logN）

## 4. 总结
底层使用TreeMap实现，value使用newObject作为占位符
