# Third-party software / 第三方软件

Inkerio and BlogCTL original code use MIT. Third-party code retains its own copyright and license; repository LICENSE does not replace those terms. Site authors own their content and must independently clear photographs, illustrations, fonts and other media.

## Legacy dependency notice: fhttp v0.6.9

Earlier BlogCTL releases through v0.1.193 included the `tls-client` / `fhttp` browser-fingerprint transport. The `fhttp v0.6.9` distribution did not include an identifiable license covering the entire module; it must not be described as verified or automatically authorized. The source at the current branch removes this transport and its dependency chain; the previously published binaries are unaffected by a source-only change.

**Important:** Removing a third-party library only addresses the source/build redistribution issue. It does not establish authorization to access nonpublic publishing endpoints. Platform API and automation permissions must be audited separately. Do not publish new bundles unless the automatic license collector and release checks pass.

此前至 v0.1.193 的 BlogCTL 版本使用过 `tls-client` / `fhttp` TLS 指纹传输，其中 `fhttp v0.6.9` 尚无法确认完整模块的许可，不能追溯认定已经获得授权。当前代码移除了该依赖链，但旧版本二进制并不会被自动改变。替换库只解决一类再分发问题，不代表相关平台的非公开接口自动化已被授权；新版本仍须通过依赖许可审核和发布验证。

## Release collection

The BlogCTL publication workflow runs pinned `github.com/google/go-licenses/v2@v2.0.1` before packaging/publishing a new version. Unknown or incompatible licenses fail this publication gate. Newly built BlogCTL binary ZIPs now include `THIRD_PARTY_LICENSES/`, aggregated from all six Windows/macOS/Linux GOOS/GOARCH target graphs and the project's MIT license, and packaging fails if third-party license files are missing. Existing v0.1.193 ZIPs include only the original project MIT license; the extension preserves i18next's MIT text. Do not describe legacy release bundles as fully audited or retroactively corrected.

The Astro engine is distributed as source with package-lock.json. `npm ci` installs dependencies with their upstream license files. If redistributing built site JavaScript, node_modules or a container, preserve licenses for the exact shipped packages, including `public/u.js.LICENSE.txt` and relevant bundler-generated notices. Do not assume a source checkout inventory covers a separately bundled deployment.

Inkerio 与 BlogCTL 的原创代码采用 MIT，第三方代码、内容及素材的权利独立。BlogCTL 发布工作流在新版本打包前检查依赖授权，遇到未知许可即中止；新的二进制 ZIP 内将包含第三方依赖许可全文（`THIRD_PARTY_LICENSES/`），缺少许可文件会阻止打包；旧版本 ZIP 不会被追溯修复。扩展保留 i18next 与项目许可。引擎源码通过 npm ci 安装上游依赖；再分发构建后的 JS、node_modules 或容器时，须保留实际交付组件的许可与生成声明，包括 Umami 的随附许可。个人文章、照片及用户内容不因引擎 MIT 授权而改变许可。
