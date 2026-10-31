# Third-party software / 第三方软件

Inkerio and BlogCTL original code use MIT. Third-party code retains its own copyright and license; repository LICENSE does not replace those terms. Site authors own their content and must independently clear photographs, illustrations, fonts and other media.

## Pending release blocker: fhttp v0.6.9

The current dependency `github.com/bogdanfinn/fhttp v0.6.9` has no LICENSE in its tagged module or current upstream repository. Some source headers refer to the Go BSD license, but that alone does not establish the terms for all fork modifications. The automatic collector therefore reports an unknown license and blocks new packaging. Do not label this dependency MIT/BSD by assumption, bypass the error or claim a complete verified bundle until the applicable permission is established or the dependency is replaced. Existing v0.1.193 has project MIT files but is not certified by this new dependency check.

当前 fhttp v0.6.9 及上游仓库缺少独立 LICENSE，部分 Go BSD 文件头不足以替整个 Fork 确认授权。自动收集会阻止新打包；需核实上游授权或替换依赖后才能解除，不应猜测许可或忽略检查。

## Release collection

The BlogCTL publication workflow runs pinned `github.com/google/go-licenses/v2@v2.0.1` before packaging/publishing a new version. Unknown or incompatible licenses fail this publication gate. Per-target automatic full-license ZIP packaging is prepared separately and remains blocked until the dependency above is resolved. Existing v0.1.193 executable ZIPs include the project's MIT license; the extension also preserves i18next's MIT text. They must not be described as a completed transitive-license audit.

The Astro engine is distributed as source with package-lock.json. `npm ci` installs dependencies with their upstream license files. If redistributing built site JavaScript, node_modules or a container, preserve licenses for the exact shipped packages, including `public/u.js.LICENSE.txt` and relevant bundler-generated notices. Do not assume a source checkout inventory covers a separately bundled deployment.

Inkerio 与 BlogCTL 的原创代码采用 MIT，第三方代码、内容及素材的权利独立。BlogCTL 发布工作流在新版本打包前检查依赖授权，遇到未知许可即中止；按目标平台随包分发完整依赖许可的改动另行保留，待上游授权明确后完成。扩展保留 i18next 与项目许可。引擎源码通过 npm ci 安装上游依赖；再分发构建后的 JS、node_modules 或容器时，须保留实际交付组件的许可与生成声明，包括 Umami 的随附许可。个人文章、照片及用户内容不因引擎 MIT 授权而改变许可。
