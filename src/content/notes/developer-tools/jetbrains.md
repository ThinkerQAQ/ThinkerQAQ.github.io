---
title: "1.1 JetBrains"
description: "JetBrains / GoLand 使用记录：快捷键与共享索引。"
sourcePath: "Others/软件/JetBrains.md"
category: "developer-tools"
categoryLabel: "Developer Tools"
topic: "software-tools"
topicLabel: "1.Software Tools"
order: 1
tags: ["Developer Tools", "JetBrains", "GoLand"]
updatedAt: "2026-09-15T11:40:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Goland
### 1.1. 快捷键
example  
F1 quick doc  
ctrl+f2 change signature  
extend selection  
.err .var  
alt+enter 自动创建变量

### 1.2. 共享索引

#### 1.2.1. 环境搭建（可选）

原笔记记录的是 GoLand 2022 时代通过 `idea.properties`、`dump-shared-index` 和 `cdn-layout-tool` 生成共享索引的流程。这个命令行接口已经变化。

当前 JetBrains Shared Indexes 工具独立提供 CLI。先下载与当前 IDE 对应的工具，并准备 IDE 与项目路径：

```cmd
ij-shared-indexes-tool-cli.bat boost --ij <IDE_PATH> --project <PROJECT_PATH>
```

这里不再固定个人 `TEMP`、Toolbox 版本目录或机器路径。

#### 1.2.2. 导出项目索引

使用当前工具生成项目共享索引：

```cmd
ij-shared-indexes-tool-cli.bat indexes ^
  --ij <IDE_PATH> ^
  --project <PROJECT_PATH> ^
  --base-url https://<INDEX_SERVER>/goland ^
  --data-directory <INDEX_DATA_DIR>
```

具体参数应以当前 JetBrains 文档为准。

#### 1.2.3. 创建共享索引元信息

旧笔记单独使用 `cdn-layout-tool` 生成 metadata。当前 Shared Indexes CLI 已负责生成可供上传的索引和相关数据，因此无需继续固定旧版 `cdn-layout-tool` 命令。

#### 1.2.4. 上传共享索引到CDN服务器

1. 准备一个可以通过 HTTP/HTTPS 访问的文件服务器。
2. 将生成的共享索引目录上传到服务器。

不要在公开笔记中写入私有 IP、内网域名或本机绝对路径。

#### 1.2.5. 使用索引

客户端是否需要项目配置文件、插件以及配置格式会随 IDE 版本变化，应以当前 JetBrains Shared Indexes 文档为准。核心流程仍然是：

```text
生成索引 → 上传到索引服务器 → IDE 下载并复用共享索引
```

`GoLand` 中可以从 Settings / Shared Indexes 相关入口查看共享索引状态。

## 2. 参考
- [Shared indexes | IntelliJ IDEA](https://www.jetbrains.com/help/idea/shared-indexes.html)
