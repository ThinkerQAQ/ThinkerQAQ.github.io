# Third-party software / 第三方软件

This site integration repository is MIT-licensed. Third-party components, static assets and deployed Workers retain their respective upstream licenses; the repository MIT license does not alter those terms. For example, `public/u.js` is accompanied by `public/u.js.LICENSE.txt`.

The reusable [Inkerio engine](https://github.com/ThinkerQAQ/inkerio) has its own dependency inventory and third-party notices. Canonical articles, photography and original illustrations are governed by the author's separate content policy, not by the engine or site-wrapper MIT license.

`tools/blogctl/` is temporarily retained to support existing search and AI Search CI tasks during migration; no BlogCTL software releases are built or published from this repository. Historical source and release tags may include third-party dependency versions whose redistribution terms were not fully established at that time (notably `tls-client` / `fhttp v0.6.9`). Do not treat a historical release as automatically cleared for redistribution. See the current [SyndiRelay](https://github.com/ThinkerQAQ/syndirelay) project for distribution-related licensing work. Removing old source files does not retroactively change previously distributed binaries or grant permission to automate third-party platforms.

---

本站集成仓库采用 MIT 许可证。第三方组件、静态资源与 Worker 保留各自的原始许可；例如 `public/u.js` 附带 `public/u.js.LICENSE.txt`。通用博客引擎的依赖与许可说明由 [Inkerio](https://github.com/ThinkerQAQ/inkerio) 维护。文章、摄影与原创插图适用作者独立的内容授权规则。

`tools/blogctl/` 暂时仅服务旧版搜索和 AI Search 部署流程，本站仓库不再构建或发布 BlogCTL Release。历史版本中曾包含许可状态未完全核清的依赖（尤其是 `tls-client` / `fhttp v0.6.9`），不能因当前代码删除了有关依赖就追溯认定旧二进制已获授权；对第三方平台的自动化权限也应另行核查。
