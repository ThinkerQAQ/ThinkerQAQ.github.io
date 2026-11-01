# Third-party software / 第三方软件

The website deployment wrapper is MIT-licensed. Third-party components, public assets and deployed Workers retain their respective upstream licenses; this repository's MIT license does not alter them. `public/u.js` is accompanied by `public/u.js.LICENSE.txt`.

The reusable [Inkerio engine](https://github.com/ThinkerQAQ/inkerio) maintains its own dependency inventory and third-party notices. Original articles, photography and illustrations are governed by the author's separate content policy.

The public-source [SyndiRelay](https://github.com/ThinkerQAQ/syndirelay) source is checked out and compiled only during CI to support search notifications and AI Search synchronization; it is neither copied into the public repository nor bundled with the static website. Its separate distribution and third-party licensing obligations remain the responsibility of that project. Historical BlogCTL releases from this repository might contain dependencies whose redistribution licenses were not fully established (notably `tls-client` / `fhttp v0.6.9`); this cleanup does not retroactively change those releases or authorize third-party platform automation.

---

本站部署仓库采用 MIT 许可证。第三方组件、公开素材和 Worker 保留各自原始许可；例如 `public/u.js` 附带 `public/u.js.LICENSE.txt`。引擎依赖及许可由 [Inkerio](https://github.com/ThinkerQAQ/inkerio) 维护，原创文章、摄影和插图使用独立内容授权。

源码公开的 [SyndiRelay](https://github.com/ThinkerQAQ/syndirelay) 仅在 CI 临时环境检出和编译，用于搜索通知及 AI Search 同步，源码和程序不会进入公开仓库或静态网站产物。其依赖许可与发布合规独立处理。历史 BlogCTL Release 曾包含许可状态未完全确认的依赖（特别是 `tls-client` / `fhttp v0.6.9`）；移除旧代码不代表追溯修复已发布二进制，也不代表自动取得第三方平台的自动化授权。
