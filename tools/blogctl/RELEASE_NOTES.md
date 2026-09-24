# BlogCTL v0.1.63

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。这个 Release 只保留当前版本；旧版 GitHub Release 会自动清理，历史 Git 标签保留。

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

版本：`0.1.63`
