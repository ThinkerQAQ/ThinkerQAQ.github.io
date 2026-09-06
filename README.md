# ThinkerQAQ 网站骨架

当前内容已清空，保留 Astro、Markdown 内容模型、Pagefind 搜索能力、draw.io / PlantUML 静态图表和 GitHub Pages 构建配置。没有预填笔记、文章、项目、系列或个人介绍。

## 本地打开

双击 `start-local.cmd`，或在本目录运行：

```powershell
$env:ASTRO_TELEMETRY_DISABLED='1'
npm run local
```

使用终端显示的 localhost 地址。停止预览：`npm run stop:local`。本地操作不会发布线上。

`npm run local` 和 `npm run dev` 默认包含 `status: draft` 的文章，并显示“草稿”标记，方便发布前审阅；正式的 `npm run build` 只生成 `status: published` 的文章，草稿不会进入页面、搜索索引或 RSS。

## 内容目录

- `src/content/notes/`：笔记。
- `src/content/articles/`：文章，只有 `status: published` 的文章生成公开页面。
- `src/content/projects/`：项目。
- `src/content/series/`：系列。

这些目录当前均为空。页面、组件和布局留作后续重建基础；内容字段定义在 `src/content.config.ts`。首页与关于页已清空，需要重新设计后再填充。

## 防止旧内容回流

`scripts/content-policy.mjs` 中的 `IMPORT_ENABLED` 为 `false`，公开目录白名单、文章初始化清单和精选清单均为空。`npm run sync:notes` 不会读取原始 VNote，也不会导入文件；`npm run seed:articles` 不会创建旧文章。重新导入必须主动修改策略。

原始 `C:\software\Others\Sync\Notes\vnotes` 没有改动。

## 本地恢复备份

清空前的内容、附件、旧 Wiki 文件和页面配置已移至 `.content-backups/reset-20260904-214638/`，按原路径保存。备份不参与构建、搜索或 Git 提交。需要恢复时，先确认恢复范围，再复制对应文件；不要盲目覆盖后续新内容。

## 图表、搜索与检查

draw.io 用于需要手工布局的架构图和文章主图：源文件放在 `src/diagrams/drawio/`，构建脚本通过 draw.io Desktop 导出到 `public/diagrams/drawio/`。生成的 SVG 和源文件一起进入版本管理；没有 draw.io 图时不要求安装桌面程序。详细规则见 [`docs/diagrams.md`](docs/diagrams.md)。

`puml` / `plantuml` 代码块继续在构建时转换成本地 SVG。保留内容哈希缓存、SANDBOX 渲染、失败文件与行号日志。首次生成需要 Java 17+，渲染器使用锁定版本与 SHA-256 校验；Windows 使用自带 Graphviz，Linux 的布局工具和中文字体已配置在工作流中。

- `npm run diagrams`：生成 draw.io 与 PlantUML 图表，空站点生成零张。
- `npm run diagrams:drawio`：只导出发生变化的 `.drawio` 图源。
- `npm run check:drawio`：不渲染，只校验已提交的 draw.io SVG 是否最新。
- `npm run test:diagrams`：使用独立测试数据检查渲染能力，不向网站添加内容。
- `npm test`：图表测试、类型检查、构建及链接校验。

空站点不生成搜索索引；添加公开内容后，构建会重新启用索引。生成的附件不包含本地备份。

## 文章评论

正式文章通过 utterances 使用 `ThinkerQAQ/ThinkerQAQ.github.io` 仓库的 GitHub Issues 作为评论区，以文章 `pathname` 建立一一对应关系，并统一添加 `blog-comment` 标签。启用前需要为该仓库安装 [utterances GitHub App](https://github.com/apps/utterances)，并确保 Issues 功能已开启。

推送到 `master` 后，GitHub Actions 会执行检查、构建并将 `dist/` 发布到 [GitHub Pages](https://thinkerqaq.github.io/)。仓库的 Pages 发布来源应设为 GitHub Actions。不要公开本地备份目录。
