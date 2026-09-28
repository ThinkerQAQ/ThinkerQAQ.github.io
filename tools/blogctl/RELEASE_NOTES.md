# BlogCTL v0.1.97

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。这个 Release 只保留当前版本；旧版 GitHub Release 会自动清理，历史 Git 标签保留。

## 本版本更新

- 修复思否 / SegmentFault 草稿创建与更新被错误的 `/gateway/tags` 预解析阻塞：草稿接口不再依赖未经抓包验证的标签列表请求。
- 思否发布阶段改为在真实浏览器编辑器中输入标签并按 Enter 选中；同时收紧候选点击逻辑，并在一个标签都未被编辑器接受时明确失败，不再静默进入发布确认。
- 保留草稿 API 与最终发布职责分离：草稿负责标题、正文和图片，标签由 SegmentFault 当前编辑器发布流程确认。

# BlogCTL v0.1.96

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。这个 Release 只保留当前版本；旧版 GitHub Release 会自动清理，历史 Git 标签保留。

## 本版本更新

- 检测 / 更新 / 发布三个文章选择器在选中文章后自动收起候选列表；再次聚焦或输入搜索词时才重新展开，并支持 Esc 收起。
- 日志查看器新增 DEBUG / INFO / WARN / ERROR、时间、字段名和 URL 高亮；自动刷新不会再打断正在进行的文本选择，并新增“复制”按钮，可复制选中日志或当前可见日志。
- 分发编译器会在平台上传前把 Mermaid / PlantUML 生成的 PNG 限制在 4096×4096 以内；超限图片按比例缩小、不裁剪，并会处理已有的 .distribution 缓存，避免 DEV.to HTTP 422。

# BlogCTL v0.1.95

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。这个 Release 只保留当前版本；旧版 GitHub Release 会自动清理，历史 Git 标签保留。

## 本版本更新

- 思否 / SegmentFault 创建或更新草稿前会查询平台标签列表，将文章标签转换为平台要求的标签 ID，避免因草稿缺少标签而无法发布。
- 51CTO 创建、更新和发布草稿时会携带文章标签，并根据平台分类接口自动解析一级分类、二级分类和个人分类，补齐发布必填字段。
- 51CTO 与思否的发布能力声明新增标签支持，并在分类解析、标签转换及上游失败节点记录可定位问题的结构化日志。

# BlogCTL v0.1.94

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。这个 Release 只保留当前版本；旧版 GitHub Release 会自动清理，历史 Git 标签保留。

## 本版本更新

- 发布页新增文章列表：默认列出全部本地文章，选中某篇文章后只显示该文章的发布记录，与检测 / 更新页的文章选择方式统一。
- 索引页 Google URL Inspection 进入配额阻塞状态后，“检查下一批”改为可点击的“重试检查”，配额恢复后可直接继续，不再卡住。

# BlogCTL v0.1.93

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。这个 Release 只保留当前版本；旧版 GitHub Release 会自动清理，历史 Git 标签保留。

## 本版本更新

- 绑定页每个平台卡片新增“检测此平台”按钮：可单独检测某个平台的本地文章关联，不必一次性跑全部勾选平台。
- 更新页每个平台卡片新增“更新此平台”按钮：可单独创建 / 更新某个平台的远端草稿，单平台任务启动后按平台区分提示。
- 检测 / 更新进行中的平台按钮显示“检测中… / 更新中…”，并互斥禁用其余平台操作，避免并发写同一 publication state。
- 文章搜索框默认列出全部本地文章并高亮当前选中项；选中或搜索后列表保持可见，移除原先的自动收起逻辑。

- 修复 GSC URL Inspection 的误失败：普通帮助/历史文案中的“请稍后重试”不再被当成活动错误，只有可见 alert/dialog/status 错误面才会判定失败。
- Request Indexing 在尚未点击提交前遇到安全的 Inspection 结果失败时，会重试同一 URL；遇到无法安全继续的系统性失败则立即暂停并停留在当前 URL，避免污染后续队列。
- 修复 URL Inspection 批次续跑的进度显示，统一使用全局 URL 序号 / 全局 inventory 总量。

- 修复 Google Request Indexing 看似卡住：GSC 概述页不再被历史索引文本误判为已就绪，目标 URL 可从检查控件值识别，只有真实结果弹窗才会阻塞下一条；任务会持久化当前 `processing` 项并显示正在处理的 URL 序号，同时记录开始、结束、结果与耗时。
- 修复从旧版升级后 Edge / Chrome 仍保留 BlogCTL 写入的浏览器代理：本版本只在确认代理仍由 BlogCTL Extension 控制时执行一次 `clear`，不写入任何新浏览器代理；清理完成后由 SwitchyOmega、系统或用户继续管理浏览器代理。`proxy` 权限仅用于这次兼容迁移，下一版本移除。
- Google URL Inspection 遇到 HTTP 429 / `RESOURCE_EXHAUSTED` 时不再标记普通失败：任务会保留进度并进入配额阻塞状态，配额恢复后可直接重试。
- URL Inventory 刷新与 Inspection 启动时会按当前 sitemap URL 集合清理已删除页面的历史 Inspection 结果，避免出现 `已检查 > URL 总数`（例如 1462 / 1353）。
- 日志页增加全文搜索和“全选日志”；搜索可与级别过滤组合，全选时自动暂停刷新便于复制。
- 索引页的实时状态改为从 durable task 恢复：任务仍在运行时，URL Inspection / Request Indexing 不再因为独立状态文件或 Extension 重载而显示成未运行。
- Network Proxy 改为 DownKit 同类的组件级代理：只注入 BlogCTL Bridge HTTP Client 与 Search Node/工具子进程，不再申请或修改浏览器代理。
- BlogCTL Extension 增加正式图标，并显示在 Chromium 工具栏与侧边栏标题区。
- Medium 文章检测改为 GraphQL 分页查询，每页遵守平台最多 25 条的限制。
- Medium 图片上传保留完整浏览器 Cookie，并在 PNG 被拒绝时转换为 JPEG 重试。
- 51CTO 草稿检测按当前 AJAX 契约请求；发布响应支持 gzip、br、deflate、zstd 解压后再解析 JSON。
- 掘金、CSDN、知乎和开源中国支持从已发布文章解析可编辑草稿关系，并阻止无法安全更新的目标。
- Browser Profile 请求日志补充响应压缩编码与解压状态，不记录正文、Cookie 或密钥。

## 浏览器插件功能

### Bridge / Native Messaging
- 通过 Chromium Native Messaging 启动、连接和复用本地 BlogCTL Bridge。
- 不需要手动常驻启动 Bridge；插件需要时自动连接或拉起。
- 显示 Bridge 当前连接状态，并支持手动刷新。
- 浏览器 Cookie / User-Agent 只在发布任务需要时交给本地 Bridge，短期驻留内存，不写入 BlogCTL 配置。
- 支持浏览器上下文操作通道，用于必须由真实登录浏览器执行的 Medium、SegmentFault、51CTO 操作。

### 平台登录状态检测
支持检测：博客园、掘金、CSDN、思否 / SegmentFault、知乎、51CTO、开源中国、今日头条、DEV.to、Medium。

单个平台检测失败不会把其他平台状态一起标记为未知或失败。

### 文章关联检测与绑定
- 从本地文章中按标题或 slug 搜索。
- 平台支持多选、全选、反选。
- “检测文章关联”只检测当前勾选的平台。
- 展示远端草稿 / 已发布文章候选、远端 ID、状态和文章链接。
- 每一篇候选文章都有独立 checkbox。
- 支持跨平台批量绑定、批量解绑。
- 绑定只维护本地 publication state，不删除远端文章。
- 支持已有绑定状态、远端状态变化和候选匹配结果展示。
- 支持手动输入文章 ID / 链接进行验证并绑定：博客园、掘金、CSDN、思否、知乎、51CTO、开源中国、DEV.to、Medium。
- 今日头条当前不提供手动 ID / 链接绑定入口。
- 持久化绑定状态统一保存在 `.blogctl/publications.json`。

### 草稿创建与更新
- 选择本地文章和目标平台后批量创建 / 更新远端草稿。
- 已有草稿关系时执行更新；没有草稿关系时执行创建。
- 支持平台全选、反选。
- 多平台任务并行执行，不再无意义串行排队。
- 每个平台编译、图片处理、草稿更新互相隔离；一个平台失败不会拖垮其他平台。
- 更新完成后可直接进入任务详情或发布流程。

### 发布
- 从 publication inventory 中选择已保存草稿发布。
- 支持按文章标题、slug、平台、远端 ID 搜索。
- 支持按平台和状态过滤。
- 支持全选、反选和批量发布。
- 发布前使用草稿 hash / 内容 hash 做一致性保护，避免本地内容在预览后变化却直接发布旧草稿。
- 发布成功后记录公开文章 ID、URL、发布时间和内容 hash。
- 已发布文章和草稿关系统一进入 durable publication state。

### 任务中心
- 查看同步任务、平台级运行状态和详细日志。
- 显示 queued / running / completed / failed 等状态。
- 支持刷新任务、清理已结束任务、失败任务重试。
- 支持草稿确认后再显式发布。
- 多平台运行状态彼此独立。

### 平台配置
- 每个平台独立配置发布语言。
- 中文平台默认中文源文；DEV.to / Medium 默认英文源文，可按平台修改。
- 发布语言影响标题、描述、标签、正文以及 Canonical / Footer 链接。
- 平台能力由统一 registry 管理，插件只展示已被 publisher 验证过的能力。

### 环境与本地配置
- 配置并检查 BlogCTL 内容仓库 / Engine 仓库路径。
- 配置本地工具路径。
- 配置 HTTP 网络代理开关、Host、Port。
- Bridge 外部 HTTP/HTTPS 请求可统一走代理；本地 loopback 通信不会经过外部代理。
- 环境配置保存在用户本机配置目录。

## 发布与内容处理能力

### 统一 Compiler
所有平台发布前统一经过 BlogCTL Compiler：
- Markdown / HTML 平台适配。
- 标题、description、tags 归一化。
- Canonical / Footer 生成。
- 内容 hash 计算。
- 平台特定格式转换。
- Medium-safe 格式转换。
- Mermaid / PlantUML 识别与渲染。

### Mermaid / PlantUML 与图片
- Mermaid / PlantUML 在本地渲染成发布图片。
- 优先使用目标平台自己的图片上传能力。
- 平台原生图片上传失败时才使用 Cloudflare R2 fallback。
- R2 不再是正常发布流程的前置条件。
- 知乎支持生成图片的原生二进制上传到知乎图片存储。
- 掘金、CSDN、博客园等使用各自已验证的图片上传 / 重写流程。
- 图片与平台任务互相隔离，一个平台图片失败不会影响其他平台。

## 平台能力

### Medium
- 使用统一 CompiledArticle 输入。
- 草稿创建 / 更新通过 Browser Bridge 工作流。
- Medium 写请求通过已登录浏览器网络栈执行，避免本地 Go HTTP Client 被 Cloudflare 403 拦截。
- 普通非 Medium 图片下载仍走本地 HTTP，不强制经过浏览器。
- Medium 输出会清理冗余目录，规范标题层级、表格、列表、任务列表、admonition、代码块等格式。
- 无法可靠自动完成的编辑器字段保持 fail-closed，不伪造成功状态。

### 掘金
- 草稿创建、更新、发布。
- 保留已有草稿的分类、标签、封面、原创 / 英文标志、主题和图片元数据。
- 发布时保留 column / theme。
- 草稿缺少 category / tags 时，自动查询当前掘金分类和标签 API，修复草稿后重新读取并发布。
- 支持图片上传和 ImageX。

### CSDN
- 草稿列表 / 文章列表关联检测。
- 草稿创建、更新、发布 / 再发布。
- 支持当前 CSDN HMAC 请求签名，包括 `getArticle` canonical query 规则。
- 支持文章 ID / 公开链接 / 编辑链接手动绑定。

### 思否 / SegmentFault
- 草稿创建与更新。
- 关联检测与手动绑定。
- 发布阶段使用当前已登录的 SegmentFault 浏览器编辑器确认发布，不依赖已经失效的旧私有发布 endpoint。
- 发布完成后回收最终公开文章 ID / URL 写入 publication state。

### 知乎
- 草稿创建 / 更新。
- 文章绑定与关联检测。
- 图片 URL import。
- Mermaid / PlantUML 等本地生成图片支持知乎原生二进制上传和 OSS 临时凭证签名。
- 正常知乎发布不要求预先配置 R2。

### 51CTO
- 草稿创建 / 更新。
- 草稿关联检测与手动 ID / 链接绑定。
- 发布阶段使用当前已登录浏览器编辑器完成发布确认，不假定旧发布接口返回 JSON。
- 发布完成后记录最终公开文章 URL。

### 开源中国
- 草稿 / 文章关联检测。
- 草稿创建与更新。
- 手动 ID / 链接绑定。
- 远端 ID 在当前登录账号范围内核验。

### 博客园
- 草稿 / 已发布文章关联检测。
- 创建 / 更新草稿。
- 已发布文章绑定、远端验证和状态变化检测。
- 手动文章 ID / 链接验证绑定。
- 支持文章链接和 durable publication state。

### DEV.to
- 使用官方 Forem API。
- 草稿 / 发布文章管理。
- 支持 Canonical、Tags、Cover 等原生能力。
- 支持 publication inventory 和远端状态。

### 今日头条
- 作为 BlogCTL 统一平台 registry 的发布目标。
- 支持当前已实现的草稿 / 发布与图片能力。
- 当前不提供手动 ID / 链接绑定入口。

## 安全与一致性
- Browser session 只交给本地 loopback Bridge。
- 不把浏览器 Cookie 持久化到仓库或 BlogCTL 配置。
- `.blogctl/publications.json` 持久化远端绑定 / 草稿 / 发布状态。
- `.distribution/` 仅保存编译、图片和调试缓存。
- 发布任务按平台隔离并支持并行执行。
- Remote ID / URL / hash / timestamps 统一由 Go control plane 写入。
- 插件、Bridge、CLI 使用同一个任务和 publication state 模型。

## Release 内容
- Windows amd64 / arm64 可执行文件。
- macOS amd64 / arm64 可执行文件。
- Linux amd64 / arm64 可执行文件。
- `blogctl-extension.zip`。
- Windows / macOS / Linux Native Messaging 安装脚本。
- Windows / macOS / Linux 卸载脚本。
- `SHA256SUMS`。

版本：`0.1.93`
