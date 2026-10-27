# Inkerio 文档

[English](../index.md) · [仓库首页](../../README_ZH.md)

本仓库管理 Inkerio 博客引擎。[inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template) 提供公开示例，ThinkerQAQ 的个人博客是引擎的一个部署实例。文章和笔记来自独立的 `blog-content`，由 BlogCTL 装配后交给 Astro 构建。多平台分发功能在 [BlogCTL 文档](../../tools/blogctl/docs/zh-CN/index.md)中介绍。

| 想做什么 | 从这里开始 |
| --- | --- |
| 尽快看到博客运行 | [快速开始](quick-start.md) |
| 接入自己的内容仓库 | [从零构建一个站点](tutorial/first-site.md) |
| 文章与笔记的思维导图视图 | [文章与笔记思维导图](how-to/mindmap-notes.md) |
| 替换作者身份、域名与服务 | [站点个性化](how-to/customize-site.md) |
| 理解内容、渲染和部署的关系 | [系统架构](concepts/system.md) |
| 理解搜索、统计与 Worker | [站点集成](concepts/search-and-integrations.md) |
| 添加文章或排查故障 | [操作指南](how-to/index.md) |
| 查询准确的命令、配置和数据模型 | [参考手册](reference/index.md) |
| 使用已有实例 | [示例](examples/index.md) |
| 了解架构约束 | [架构原则](architecture/principles.md) |

命令与配置以仓库当前实现为准。文档若与代码不一致，应在同一次修改中修正文档。

## 文档结构

| 分层 | 负责什么 |
| --- | --- |
| Quick Start / 快速开始 | 最短路径运行示例站点 |
| Tutorial / 教程 | 使用可编辑内容仓库完成一条学习流程 |
| Concepts / 概念 | 系统模型、职责与关系 |
| How-to / 操作指南 | 解决一个具体任务或问题 |
| Reference / 参考手册 | 准确的命令、配置与 Schema |
| Examples / 示例 | 可运行的示例内容与配置 |
| Architecture / 架构 | 设计原则、约束与扩展决策 |

站点文档放在 `docs/`，发布工具文档放在 `tools/blogctl/docs/`，通过链接关联，避免复制维护。英文文档直接位于各自文档根目录，中文对应文档位于 `zh-CN/`，保持相同的相对路径。
