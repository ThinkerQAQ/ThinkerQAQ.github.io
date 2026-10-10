# 教程：用独立内容仓库运行博客

这里从一个公开的内容模板开始，完成内容装配、预览和本地验证。

## 1. 获取两个仓库

```bash
mkdir thinkerqaq-blog
cd thinkerqaq-blog
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
git clone https://github.com/ThinkerQAQ/blog-content-template.git blog-content
```

此时 `ThinkerQAQ.github.io/` 与 `blog-content/` 处于同一层目录。模板仓库只是示例，不包含博客的私有生产内容。

## 2. 安装依赖

```bash
cd ThinkerQAQ.github.io
npm ci
```

需要 Node.js 22+、Go 1.27.1。使用完整图表构建时还需要 Java 17+、Graphviz 和无头 Chromium。

## 3. 装配内容

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
```

命令将内容装配到引擎的 `src/content/`。这里是构建输入；后续编辑仍在 `../blog-content/` 完成。

## 4. 预览

```bash
npx --no-install astro dev --port 4321
```

打开 [localhost:4321](http://localhost:4321)，检查文章、笔记、项目页面。这里直接启动 Astro，避免 `dev:quick` 重新装配 `fixtures/` 覆盖刚装配的模板内容。

如果需要在预览前渲染图表，装好图表依赖后使用 `npm run dev:site`。

## 5. 修改与验证

修改 `../blog-content/src/content/articles/` 下的一篇文章，重新执行第 3 步的装配命令，然后运行：

```bash
npm run check
npm run build
```

完整构建产物位于 `dist/`。部署方法见[部署指南](../how-to/deploy.md)，内容字段见[Schema 参考](../reference/content-schema.md)。
