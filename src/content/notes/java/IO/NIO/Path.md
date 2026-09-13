---
title: "3.17 Path"
description: "是什么 表示文件路径，类似于File类 绝对路径 相对路径"
sourcePath: "Java/IO/NIO/Path.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 117
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 是什么

表示文件路径，类似于File类

### 绝对路径
```java
	//linux
	Path path = Paths.get("/home/zsk/code/Java/my_spring_boot_template/pom.xml");
	//windows
	Path path = Paths.get("c:\\data\\myfile.txt");
	Path path = Paths.get("c:/data/myfile.txt");
```


### 相对路径
```java
	Path path = Paths.get("/home/zsk/code/Java/my_spring_boot_template", "pom.xml");

	Path currentDir = Paths.get(".");

	Path parentDir = Paths.get("..");


	String originalPath = "/home/zsk/code/Java/my_spring_boot_template/../";

	Path path1 = Paths.get(originalPath);
	System.out.println("path1 = " + path1);

	Path path2 = path1.normalize();//打印出完整路径
	System.out.println("path2 = " + path2);
```
