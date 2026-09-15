---
title: "2.1 Base64"
description: "Base64 的编码原理、常见用途以及它与加密、URL 编码的区别。"
sourcePath: "Safe/Base64.md"
category: "security"
categoryLabel: "Security"
topic: "encoding"
topicLabel: "2.Encoding"
order: 2
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Base64 是什么

Base64 是一种**二进制到文本的编码方式**，把任意字节序列表示成一组 ASCII 字符。

> Base64 不是加密，也不能提供机密性。任何人都可以直接解码。

## 2. 编码流程

1. 每 3 个字节组成 24 bit。
2. 将 24 bit 划分为 4 组，每组 6 bit。
3. 每个 6 bit 的值作为 Base64 字符表的索引。
4. 输入长度不是 3 的倍数时，标准 Base64 通常使用 `=` 进行填充。

## 3. 使用场景

- 在只能安全传输文本的协议或格式中携带二进制数据。
- MIME 邮件附件。
- Data URL 等文本表示形式。

Base64 会使数据体积增加约三分之一，因此不适合把大型二进制对象无条件嵌入文本。

## 4. Base64 与 URL 编码

两者解决的问题不同：

- Base64：把字节序列编码成文本。
- URL percent-encoding：把 URL 中具有特殊含义或不适合直接出现的字节编码为 `%HH`。

URL-safe Base64 会把标准字符表中的 `+`、`/` 替换成 `-`、`_`，但它仍然只是编码。
