# 示例：使用仓库自带内容

想验证网站本身是否能运行，可以直接使用 `fixtures/`，不需要私有文章仓库或发布平台账号。

```bash
npm ci
npm run dev:quick
```

打开 [localhost:4321](http://localhost:4321)。检查页面、文章、笔记、项目和系列导航。

如果已安装图表依赖，还可以运行完整构建：

```bash
npm run build:fixtures
```

示例输入位于 [`fixtures/`](../../../fixtures/)，构建命令在 [`package.json`](../../../package.json)。由 BlogCTL 装配、Astro 渲染；图表与 Pagefind 在完整构建中生成。
