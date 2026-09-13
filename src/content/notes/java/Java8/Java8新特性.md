---
title: "13.1 Java8新特性"
description: "1. 新特性 - Lambda 表达式（允许把函数作为一个方法的参数） - Stream API - Date Time API - Optional 类 - PermGen空间被移除了，取而代之的是Metaspace 2. 常用 2.1. List- Map<String,List 3. 参考 -"
sourcePath: "Java/Java8/Java8新特性.md"
category: "java"
categoryLabel: "Java"
topic: "Java8"
topicLabel: "13.Java8"
order: 231
tags: ["Java"]
createdAt: "2020-02-13T15:05:42Z"
updatedAt: "2020-02-19T13:29:10Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 新特性

- Lambda 表达式（允许把函数作为一个方法的参数）
- Stream API
- Date Time API
- Optional 类
- PermGen空间被移除了，取而代之的是Metaspace

## 2. 常用
### 2.1. List->Map<String,List>

```java
public class Main 
{
    public static void main(String[] args) 
    {
        List<Employee> employeeList = new ArrayList<>(Arrays.asList(
                            new Employee(1, "A", 100),
                            new Employee(2, "A", 200),
                            new Employee(3, "B", 300),
                            new Employee(4, "B", 400),
                            new Employee(5, "C", 500),
                            new Employee(6, "C", 600)));

        Map<String, List<Employee>> employeesMap = employeeList.stream()
                                .collect(Collectors.groupingBy(Employee::getName));

        System.out.println(employeesMap);
    }
}
```

## 3. 参考
- [Java 8 \- Convert stream to Map \- HowToDoInJava](https://howtodoinjava.com/java8/collect-stream-to-map/)
