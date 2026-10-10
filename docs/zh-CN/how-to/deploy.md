# 部署博客

当前仓库使用 GitHub Actions 构建 Astro，并分别部署到 GitHub Pages 和 EdgeOne Makers。

## 准备

先完成[内容接入教程](../tutorial/first-site.md)。若使用私有内容仓库，需要具备读取权限，并在 GitHub Actions 中配置 `BLOG_CONTENT_DEPLOY_KEY`。

## 步骤

1. 检查 `.github/workflows/deploy.yml`。仓库原有配置面向 `ThinkerQAQ/blog-content`，Fork 需要修改仓库选择及部署条件。
2. 对私有内容仓库添加只读部署密钥。不要把密钥写入仓库文件。
3. 需要 EdgeOne 时配置 `EDGEONE_API_TOKEN`；只用 GitHub Pages 时应按自己的仓库调整原仓库专用条件。
4. 从 GitHub Actions 触发 `Deploy Astro site to GitHub Pages`，或通过既定的 `main` 触发方式部署。

## 验证

分别查看构建、GitHub Pages 和 EdgeOne Job，确认站点页面、RSS 与搜索功能正常。AI Search 同步和搜索引擎通知是独立 Job，失败时应单独查看日志。

内容仓库更新通过 `content-watch.yml` 检测，成功部署的内容 SHA 保存在 Actions Artifact 中。详细变量见[部署参考](../reference/deployment.md)。
