---
title: "3.12 Files"
description: "判断文件是否存在 创建目录 复制文件 移动重命名文件 删除文件 递归遍历文件"
sourcePath: "Java/IO/NIO/Files.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 112
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## Files


### 判断文件是否存在
```java
	Path path = Paths.get("data/logging.properties");

	boolean pathExists =Files.exists(path, new LinkOption[]{ LinkOption.NOFOLLOW_LINKS});
```


### 创建目录
```java
	Path path = Paths.get("data/subdir");

	try {
	    Path newDir = Files.createDirectory(path);
	} catch(FileAlreadyExistsException e){
	    // the directory already exists.
	} catch (IOException e) {
	    //something else went wrong
	    e.printStackTrace();
	}

```

### 复制文件
```java
	Path sourcePath      = Paths.get("data/logging.properties");
	Path destinationPath = Paths.get("data/logging-copy.properties");

	try {
		//可以通过StandardCopyOption.REPLACE_EXISTING覆盖文件
	    Files.copy(sourcePath, destinationPath);
	} catch(FileAlreadyExistsException e) {
	    //destination file already exists
	} catch (IOException e) {
	    //something else went wrong
	    e.printStackTrace();
	}
```


### 移动重命名文件
```java
	Path sourcePath      = Paths.get("data/logging-copy.properties");
	Path destinationPath = Paths.get("data/subdir/logging-moved.properties");

	try {
	    Files.move(sourcePath, destinationPath,
	            StandardCopyOption.REPLACE_EXISTING);
	} catch (IOException e) {
	    //moving file failed.
	    e.printStackTrace();
	}
```


### 删除文件

```java
	Path path = Paths.get("data/subdir/logging-moved.properties");

	try {
	    Files.delete(path);
	} catch (IOException e) {
	    //deleting file failed
	    e.printStackTrace();
	}
```


### 递归遍历文件
```java
	Files.walkFileTree(path, new FileVisitor<Path>() {
	  @Override
	  public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
	    System.out.println("pre visit dir:" + dir);
	    return FileVisitResult.CONTINUE;
	  }

	  @Override
	  public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
	    System.out.println("visit file: " + file);
	    return FileVisitResult.CONTINUE;
	  }

	  @Override
	  public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
	    System.out.println("visit file failed: " + file);
	    return FileVisitResult.CONTINUE;
	  }

	  @Override
	  public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
	    System.out.println("post visit directory: " + dir);
	    return FileVisitResult.CONTINUE;
	  }
	});
```
