# Production deployment transition to standalone Inkerio

**State: staged / opt-in.** `ThinkerQAQ/ThinkerQAQ.github.io` still contains the original engine for a rollback path and the BlogCTL modules used for AI Search, search notifications and releases. This migration does not delete those modules.

## Architecture

1. The site wrapper supplies `site.config.json`, the public `public/` brand assets, domain verification files and GitHub Actions.
2. Deployment checks out the **pinned Inkerio commit** `31dad0ddccee09b188deb3fe915dfec51cfcf2ea` (includes sitemap inventory and site integration compatibility).
3. Content is checked out from private `ThinkerQAQ/blog-content` using the existing read-only `BLOG_CONTENT_DEPLOY_KEY`. These credentials must never enter the public engine repository.
4. `scripts/prepare-inkerio-deployment.mjs` overlays site identity/assets on the checked-out engine. Then Inkerio independently assembles content and builds the static site.
5. The resulting `publish-dist/` feeds GitHub Pages and EdgeOne. BlogCTL remains in the site wrapper for AI Search and search engine notifications.

## Validation

- Local old/new builds used the same private content commit `25c64cdd66ec6dba9a4a859430b99346099a75d1`.
- Both Astro builds produced 3,523 pages.
- Sitemap inventory: **2,971 URLs** in both builds, with no missing or added URLs.
- All 69 PlantUML and 135 Mermaid diagrams rendered, and the main pages, RSS and Pagefind passed local checks.
- HTML byte hashes may differ due to identity/implementation changes. Site-specific title, SEO description, footer assets and the existing reaction-visitor key must be verified before cutting over.
- `inkerio-migration-validate.yml` uses only the public content template in GitHub PR CI, **never private article content**.

## Switch and rollback

Deployment reads the site repository variable `INKERIO_DEPLOY_MODE`:

- Unset or `legacy` → original BlogCTL site build, with the legacy engine and same deployment integrations.
- `standalone` → pinned Inkerio checkout, site overlay, independent Node build.
- The flag can be switched without rewriting Git history. The old source and workflow remain intact.

After review and passing CI, set `INKERIO_DEPLOY_MODE=standalone` and dispatch `deploy.yml` using a known `content_sha`. Check **both** GitHub Pages and EdgeOne along with live canonical, hreflang, RSS, sitemap, search and media.

For rollback, set `INKERIO_DEPLOY_MODE=legacy` and dispatch `deploy.yml` with the same content commit. Retain the old engine until BlogCTL is migrated and post-cutover smoke checks pass.

**Known legacy issue:** deployment run `41193942399` completed GitHub Pages successfully but failed on EdgeOne before this migration. Treat another EdgeOne failure as a separate release blocker, not as successful cutover.

## 中文说明

独立 Inkerio 使用固定提交，真实内容仍从私有 `blog-content` 读取。新工作流默认走旧版构建，只有将仓库变量设置为 `standalone` 才切换；随时可以切回 `legacy` 并使用相同内容 SHA 重新发布。旧 BlogCTL、AI Search、搜索引擎通知、Pages 和 EdgeOne 发布链路保留。CI 使用公开的 Content Template，不在公开 PR 构建中读取私有文章。
