# Configuration Reference

BlogCTL 仅使用 `blogctl.toml` 作为用户配置文件。其他持久化状态文件（例如 `jobs.json`、`publications.json`）与它同处 `Data` 文件夹，但不属于手动编辑配置。

## Windows 默认路径

```text
C:\software\Coding\blogctl\Data\blogctl.toml
```

其他平台可通过 `BLOGCTL_DATA_DIR` 指定绝对路径覆盖默认数据目录。有关完整 TOML 字段和例子，请参阅[README Configuration](../../README.md#configuration)，此处不重复维护另一份可能过时的字段全集。

## 配置职责

| 类别 | 来源和作用 |
|---|---|
| 内容/路径 | Content Root、Engine Root；BlogCTL 的唯一内容来源 |
| 分发平台 | 语言、changed-only、Footer、Canonical、Tracking |
| 素材 | Mermaid 渲染与 R2 兜底 |
| 搜索引擎 | IndexNow、Baidu、Google Search Console |
| 运行环境 | Bridge、Native Messaging、外部依赖及代理 |

敏感值仍由现有 Go Bridge 配置 API 接受，UI 只显示是否配置；不得把密钥注入 HTML、URL、日志或 Web Console 静态 JS。

## 版本与宿主

Extension、Native Host、Bridge 保持同版。开发中的 Web Console 共用同一套 Feature/Settings Catalog，但使用独立的 Web 请求来源授权方式；不能复用扩展持有的随机令牌。
