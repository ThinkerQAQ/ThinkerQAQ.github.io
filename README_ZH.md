# Inkerio

[English](README.md) · [实际站点](https://thinkerqaq.com/) · [中文文档](docs/zh-CN/index.md)

Inkerio 是基于 Astro 的双语静态博客引擎。文章、笔记、项目、系列、摄影和健身记录保存在独立内容仓库中，引擎据此生成页面、搜索索引、RSS 和 Sitemap。

| 组成 | 用途 |
| --- | --- |
| **Inkerio** | 当前仓库中的网站渲染与静态构建 |
| **[BlogCTL](tools/blogctl/README_ZH.md)** | 配套 Go CLI、浏览器扩展和本地工作台，负责装配与分发 |
| **[inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template)** | 公开示例内容，也是创建自己内容仓库的起点 |

[ThinkerQAQ](https://thinkerqaq.com/) 是作者的部署实例。引擎仓库保留现有名称 `ThinkerQAQ/ThinkerQAQ.github.io`；使用者可以设置自己的站点名称和域名。

## 运行示例

需要 Node.js 22.12+、npm 和 Go 1.27.1。

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

访问 [localhost:4321](http://localhost:4321)。命令会在模板不存在时自动获取它、装配内容并启动 Astro，跳过图表预渲染。按 Ctrl+C 停止服务。

接着阅读[站点教程](docs/zh-CN/tutorial/first-site.md)，建立并编辑自己的内容仓库。装配会替换引擎的 `src/content`，原始写作内容应保存在内容仓库。

## 配置自己的站点

| 任务 | 中文 | English |
| --- | --- | --- |
| 安装依赖并本地运行 | [快速开始](docs/zh-CN/quick-start.md) | [Quick Start](docs/quick-start.md) |
| 添加内容与双语版本 | [站点教程](docs/zh-CN/tutorial/first-site.md) | [First site](docs/tutorial/first-site.md) |
| 替换作者身份与服务配置 | [站点个性化](docs/zh-CN/how-to/customize-site.md) | [Customize your site](docs/how-to/customize-site.md) |
| 部署 Fork | [部署指南](docs/zh-CN/how-to/deploy.md) | [Deployment](docs/how-to/deploy.md) |
| 查询字段和命令 | [参考手册](docs/zh-CN/reference/index.md) | [Reference](docs/reference/index.md) |
| 向其他平台分发文章 | [BlogCTL 中文](tools/blogctl/README_ZH.md) | [BlogCTL](tools/blogctl/README.md) |

评论、统计、点赞和问博客依赖独立服务，需要配置自己的资源；问博客目前处于关闭状态。部署前请阅读[集成参考](docs/zh-CN/reference/integrations.md)。

## 开发

[命令参考](docs/zh-CN/reference/commands.md)说明检查与构建方式，[系统架构](docs/zh-CN/concepts/system.md)说明数据流和职责。贡献者与编码 Agent 应阅读 [AGENTS.md](AGENTS.md)，BlogCTL 另有[目录规则](tools/blogctl/AGENTS.md)。

[MIT License](LICENSE)
