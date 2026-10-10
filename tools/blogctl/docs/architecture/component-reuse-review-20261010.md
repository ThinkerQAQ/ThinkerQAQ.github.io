# BlogCTL 组件复用与减负审查

> 2026-10-10 · 源码：`tools/blogctl/extension/`、`bridge/`、`publisher/`；对照 `/home/zsk/code/IDFlow/extension/`、DevTool CodeGraph + Serena。
>
> 原则：成熟组件优先复用；必须证明收益高于引入的构建、CSP、维护和迁移成本。**能用平台原生能力，不创建自研微型框架。**

## 1. 症状与根因

| 症状 | 证据 | 原因 | 本轮处理 |
|---|---|---|---|
| Tab 多出第二行 | `popup.css` 旧 `@media` 三列/两列 + `auto-fit minmax(80px)` 相互覆盖 | 七个同级 Tab 在约 690px Side Panel 错误换行 | 固定 7 列；窄屏水平滚动；删重复响应式规则 |
| 文章列表过密 | `inventory.js` 原来把标题、状态、ID 串在一个 `textContent`，查看链接另占一行 | 缺少视觉层级 | 标题强调、状态和 ID 次级、右侧编辑/查看；增加间距和行高 |
| 样式历史残留 | 已删除的独立发布页/绑定区仍留下 `.publication-item`、`.draft-binding-*`、`.binding-bulk-*` 等 | 旧工作流删了 DOM 没删 CSS | 移除不再使用的选择器和重复导航规则 |
| 手写文章搜索下拉框 | `drafts.js` 自己创建按标题过滤按钮、展开管理、keydown Escape/Enter；旧控件兼容性不完全 | 为简单选择器自行实现 combobox | **改用浏览器原生 `<datalist>`**，去掉选项弹层、键盘与展开状态逻辑 |
| 设置项导航 | `settings-navigation.js` 单独维护分类结构；IDFlow 有 `extension/src/settings/{catalog,renderer,feature}.ts` | 两个项目相似但数据 Schema 不同 | 继续复用 IDFlow 的设计契约；后续抽象到独立版本化 package，不能直接复制整个 UI 运行时 |

## 2. 复用方案审查

| 对象/位置 | 候选成熟方案 | 适配度 / 决策 |
|---|---|---|
| 下拉搜索 `drafts.js` | HTML `<datalist>` + `<input list>` | **已替换**。Edge 原生键盘选择、弹层定位、输入提示。无需包或独立事件系统。 |
| 筛选器 `inventory.js` | HTML `<select>`、`Intl`、`URL` | **保留原生组件**。只有平台和状态两项，增加 Select UI SDK 是净负担。 |
| 文章容器、折叠设置 | CSS Grid/Flex、原生 `<details>`、`hidden` | **保留原生能力**；删除陈旧的 CSS，建立单一共享样式源。 |
| 前端模块 `background.js`（约 1544 行），`bridge/control.go`（约 1654 行） | IDFlow 已使用的 TypeScript 6 + esbuild 0.25；显式 platform handler registry | **值得下一轮优先模块化**，前者按领域拆模块，后者按平台 handler 分派；需要保持单一 Bridge API，避免第二套 Controller 或新的 Runtime。 |
| 设置项树 `settings-navigation.js`（约 142 行） | IDFlow Settings Catalog/Registry/Renderer | **复用模型，待公共包稳定后移植**。两仓库配置 schema 不一致，直接引用 IDFlow repo 私有 TS 路径会形成隐藏发布依赖。 |
| 较复杂交互组件体系 | <https://lit.dev/>（Lit Web Components 3） | 成熟、体积可控、适合复杂受控组件；目前仅 7 页的简单原生控件，**暂不引入**，除非未来决定全前端响应式迁移。 |
| 完整 Web Components 套件 | <https://www.webawesome.com/> | 组件丰富、可访问性好；原 Shoelace <https://shoelace.style/> 已停止主动开发。当前引入套件会带来主题、资源打包、Go embed 和 Extension CSP 双宿主适配成本，**不全量引入**。 |
| JSON / TOML 代码编辑器 | IDFlow 已采用的 CodeMirror 6 | 仅当需要真正的源代码编辑器时使用；BlogCTL 目前是逐字段的编辑/保存/取消，保留原生输入控件。 |
| 大规模列表虚拟化 | TanStack Virtual 或浏览器原生分页 | 当前常见远端文章在几十至几百项，先利用平台后端分页和 DOM 批处理；需性能测量证实问题后再增加虚拟列表依赖。 |
| 浏览器扩展沙箱、来源限制 | Chrome Manifest V3 本地打包规范、`chrome.runtime` | **保留第一方安全边界**。第三方 UI SDK 必须随扩展打包且不得从 CDN 运行；禁止为统一 Web UI 放开跨站 Bridge 写权限。 |

参考：Chrome 官方 <https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy>；Lit <https://www.npmjs.com/package/lit>；Shoelace 官方迁移说明 <https://shoelace.style/>；IDFlow 已安装 `typescript`/`esbuild`/`@codemirror/*`。

## 3. Code Review 的具体问题和优先级

**P0（本轮完成）**

- 修正导航双行与版本间重复媒体查询，避免后面单独修 UI 时又被上面的规则覆盖。
- 统一平台文章列表密度：标题主层级、状态/ID 次层级、链接右对齐，窄屏可流式换行。
- 用原生 datalist 代替自研交互选择器；删除失效发布/绑定样式，更新旧的 article-picker 测试，不再维护不存在的 Publish 下拉框。

**P1（建议下一轮结合功能重构）**

- `background.js` 按平台会话、检测、同步、索引、Bridge 状态拆分到 TS 模块，使用 IDFlow 已验证的 **TypeScript/esbuild 打包链**，保持现有 Background Service Worker 和 `chrome.runtime.sendMessage` 契约。
- `bridge/control.go` 按 API 领域解耦，而非自己写通用消息中间件；避免一次迁移破坏身份认证、jobs.json 重试快照及并行任务。
- 建立 CSS Tokens + 两三个原生组件约定，不新造 Card/Button/Tabs 框架。必要时**只挑选独立 Web Component**并本地打包。

**P2（需要产品数据证据才做）**

- 只有在超大账号列表被明确证实卡顿时才引入虚拟化/分页。
- 只有在需要完整 TOML/JSON 编辑器、语法检测时才引入 CodeMirror。
- 不使用已停更的 Shoelace 作为新项目依赖；先审查 Web Awesome 的大小和授权。

## 4. 架构收益与风险

当前「同一套 Feature HTML/JS/CSS 通过 Extension 与 Go Web Console 提供」方案继续保留，不复制组件或状态模型。替换局部 DOM 时应避免增加依赖或破坏 CSP；第三方组件统一由构建步骤本地打包至 Extension 并嵌入 Go Bridge 二进制。使用 `devtool code verify`、Go/Node 回归、Windows Edge 双入口截图检验。

本轮改动只涉及界面及其本地文章选择器，不涉及真实第三方平台创建/更新/发布 API，也不修改 `Data` 结构。

## 5. 本轮落地：左侧导航、索引筛选与 CodeMirror 6

导航采用 IDFlow / Desktop Commander 式单层左侧菜单：检测、创建、更新、索引、任务、日志、设置。Extension 与 Web Console 共享原有 HTML、JS 和 CSS；窄窗口把导航缩成图标轨道，业务交互保持一致。

索引页通过原生 select 选择 IndexNow、百度或 Google。三者共享平台卡、状态、统计和操作的同级结构，Google 的 Sitemap / URL Inspection / Request Indexing 继续保留平台内二级能力。URL 总量由原生 details 折叠，不影响后台任务。

日志查看器已替换为 CodeMirror 6（@codemirror/state、@codemirror/view、@codemirror/search），支持只读虚拟化、行号、内置查找、级别行着色，保留旧的级别过滤、自动刷新、复制和清空。Xterm.js 主要适用于 PTY 与终端仿真，当前结构化日志无需终端模拟。CodeMirror 也是 IDFlow 已采用的成熟技术栈。

构建入口 tools/blogctl/ui/log-viewer/。固定 package-lock 依赖，执行 npm ci、npm run build 即可复现本地编译；编译后的 popup/log-editor-vendor.js 随 Extension 静态文件和 Go embed 同步发布，满足 Manifest V3 不从远端执行代码的要求。不新增常驻 Node 服务。
