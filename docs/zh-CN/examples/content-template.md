# 示例：使用公开内容模板

网站的 Markdown、月度健身 JSON 和摄影示例图片统一维护在 [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template)，**不在 Blog Engine 内保存另一份演示内容**。

```bash
npm ci
npm run dev:quick
```

首次运行会优先使用引擎同级的 `../inkerio-content-template`；若尚未克隆，就从公开 GitHub 仓库克隆。BlogCTL 装配示例到引擎的忽略目录 `src/content/`、`public/media/` 后交给 Astro 渲染，不会读取或修改私人 BlogContent。

完整构建（如果内容中使用图表，则还需要 Java/Graphviz 等依赖）：

```bash
npm run build:template
```

需要指定其他模板路径，可设置环境变量 `BLOG_TEMPLATE_ROOT`。使用真实的私有内容时，应显式运行 `go run ./tools/blogctl/cmd site assemble --content-root /path/to/BlogContent`，随后执行 `npm run dev:site`，避免重新装配模板。
