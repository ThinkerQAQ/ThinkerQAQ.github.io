# BlogCTL v0.1.180

支持在 BlogCTL 的 **Medium「更新」** 中选择已发布文章，覆盖其**编辑版本**，由用户在 Medium 上自行确认并点击 `Save and publish`。不再将已发布文章默认视为无法编辑。

## Medium 已发布文章的待发布修改

- 用户显式选择 Medium 已发布文章执行 `Update` 时，可以使用同一个远端 ID，按 Compiler 的标题＋正文完整重建编辑版本，之后利用登录浏览器把所有 PNG、表格图、封面插入原生编辑器；不另建文章。
- 与普通草稿区分保存语义：Medium 已发布文章的 GraphQL `postResult.bodyModel` 返回的是**当前公开的旧版本**，而编辑器显示的是自动保存的**待发布修改**。禁止将旧公开正文误当成待发布编辑失败；待发布版以编辑器 `Saved` 状态、图片原生 CDN、占位符为 0 进行检查。
- Medium `PublishedDraftEdit=true`，不是 `PublishedUpdate`（即时公开修改）。BlogCTL 永远**不执行 `Save and publish`**；用户审核后需亲自发布修改。
- 保留指定文章 ID、revision-checked Delta 写入、账号登录与并发编辑校验；公开文章 URL 和发布时间不改变。
- 对已经写入标题正文但检查旧公开 GraphQL 失败的中断任务，Retry 走**图片继续插入**而不是第二次全篇重写。仅允许单文章、明确的文本验证失败且无 `publishAfter` 的安全恢复路径。
- 不带浏览器图片写入的旧式自动同步仍不得无预警修改已发布文章；已发布文章更新须通过显式选择的 Medium Update。

## 测试

- 模拟已发布文章独立编辑版本，验证标题和正文逆序删除重写、图片上传、已保存状态检查、不会读取旧公开 GraphQL 作为待发布校验、不会发起任何发布接口。
- 已发布目标 Update 可用，但 `publishAfter=true` 必须拒绝；其他平台功能和已有草稿创建、更新行为不变。
- 已覆盖文本已保存但图片待插入时，原任务 Retry 不重复写标题正文。

## 安装

- CLI、Bridge、Native Host 与 Extension 均为 `0.1.180`；保留 `Data/`、凭据和发布关联。
- 解压安装的 Edge Extension 如未自动重载，应在 `edge://extensions` 手动点击重新加载。

版本：`0.1.180`
