# 将 Inkerio 部署到 GitHub Pages

这份指南把仓库已有流程改为自己的根路径站点，不需要作者的私有内容或 Cloudflare 服务。

## 1. 准备仓库

先完成[内容教程](../tutorial/first-site.md)和[站点设置](customize-site.md)，将引擎 Fork 或复制到自己控制的仓库。若使用默认用户 Pages 地址，引擎仓库命名为 `YOUR_USER.github.io`；自定义域名也可以在根路径托管。

开启 Actions，并设置 **Settings → Pages → Build and deployment → Source → GitHub Actions**。当前 Workflow 监听引擎的 `main` 分支；自己的默认分支不同，需要修改触发条件。

## 2. 配置内容来源

在 **Settings → Secrets and variables → Actions → Variables** 添加：

| 变量 | 示例 |
| --- | --- |
| `CONTENT_REPOSITORY` | `YOUR_USER/blog-content` |

Fork 的 `build` Job 读取该变量；原始引擎仓库则固定选择 `ThinkerQAQ/blog-content`。

私有内容仓库需要一对独立 SSH 密钥：公钥添加到内容仓库的只读 Deploy Key，私钥保存为引擎仓库 Secret `BLOG_CONTENT_DEPLOY_KEY`。公开内容通常不需要 SSH 部署密钥，可按需删除或留空 checkout 的 `ssh-key` 输入。

内容源不能指向引擎仓库自身。先确认目标仓库包含 `src/content/`，再运行 Actions。

## 3. 调整 `.github/workflows/deploy.yml`

现有流程同时服务作者的两个托管目标。Fork 默认会构建，但不会自动执行这些专用部署 Job。

| 位置 | 只部署 Pages 时的修改 |
| --- | --- |
| `Configure GitHub Pages` 步骤 | 把 `github.repository` 判断换成自己的引擎仓库 |
| `deploy` Job | 替换仓库判断，保留 `github-pages` Environment 和 `needs: build` |
| `deploy-edgeone` | 不使用时删除；其中包含作者的 Makers 项目名 |
| `sync-ai-search`、`notify-search` | 不使用时删除；当前依赖 `deploy-edgeone` |
| `record-content-state` | 不接入内容监控时删除；需要监控时调整判断和依赖 |
| 构建环境中的 `PUBLIC_ASK_BLOG_WORKER_URL`、`PUBLIC_UMAMI_PROXY_ORIGIN` | 删除作者的兜底地址，需要对应集成时填写自己的值 |

保留 `permissions: pages: write`、`id-token: write`，以及 `actions/configure-pages`、`actions/upload-pages-artifact`、`actions/deploy-pages`。构建步骤已安装 Go、Node、Java、Graphviz 和字体，并设置 CI 的无头 Chromium。静态产物路径是 `engine/dist`，因为 CI 将引擎克隆到 `engine/`。

仓库判断可改为：

```yaml
if: github.repository == 'YOUR_USER/YOUR_USER.github.io'
```

上述修改应在自己的 Fork 中进行，不要为了配置个人实例而改动上游生产流程。

## 4. 决定内容更新如何触发部署

引擎 `main` 推送和手动运行都会触发部署，独立内容仓库的提交不会自动变成这两种事件。

首次使用时，推送内容后手动运行 **Actions → Deploy Astro site to GitHub Pages → Run workflow** 即可。`content_sha` 可以固定内容提交；留空则读取内容仓库的默认分支。

若需要自动监听内容更新，调整 `content-watch.yml`：Job 仓库判断、`CONTENT_REPOSITORY_SSH`、内容分支（现有脚本为 `refs/heads/master`）、部署 Workflow 目标和状态记录都与作者实例有关。当前计划每十分钟检查一次，实际运行可能受 GitHub 调度延迟影响。仅使用 Pages 时，也要调整状态记录 Job 的依赖，避免因始终没有成功标记而重复请求部署。

部署流程还有每月运行一次的计划，用于发布已结束月份的健身汇总；可按需保留或删除。

## 5. 运行并检查

提交引擎配置后运行 Workflow，确认 **build** 与 **deploy** 均成功。只有 build 成功而 deploy 被跳过，不代表网站已发布。

打开 Pages 地址，检查文章、`/en/`、`/rss.xml`、`/sitemap-index.xml` 和 `/search/`，确认 canonical 使用自己的域名。自定义域名还需在 Pages 和 DNS 服务商处配置；Astro 的 `site` 不会自动修改 DNS。

## 常见失败

| 现象 | 优先检查 |
| --- | --- |
| 内容仓库克隆失败 | 仓库名、只读密钥或指定 SHA |
| 构建成功，部署跳过 | 是否仍保留原仓库判断 |
| Pages 配置或权限报错 | Pages Source、Actions 权限、`github-pages` Environment |
| 页面打开，但项目子路径下链接和图片错误 | 当前根路径路由需要根路径托管 |
| 内容仍是旧版本 | 内容仓库/SHA 是否正确，是否真正触发了部署 |
| 可选服务 Job 失败 | 单独检查其凭据，不要直接等同于 Pages 失败 |

Workflow、变量和 Artifact 说明见[部署参考](../reference/deployment.md)。
