# 配置

以 [bridge/config.go](../../../bridge/config.go) 和 [publishing/config.go](../../../publishing/config.go) 定义为准。

**界面语言：** `ui_locale` 默认为 `auto`，也可设置 `zh-CN` 或 `en`，与发布文章语言独立。见[切换界面语言](../how-to/switch-interface-language.md)。

Windows 默认使用可执行文件旁的 `Data/`，Linux/macOS 使用用户配置目录。绝对路径环境变量 `BLOGCTL_DATA_DIR` 可覆盖默认目录。

`blogctl.toml` 包含 `engine_root`、`content_root`、`log_level`、网络代理及搜索引擎配置；`jobs.json`、`publications.json` 等属于运行时数据。

```toml
engine_root = "/home/user/blog/ThinkerQAQ.github.io"
content_root = "/home/user/blog/blog-content"
log_level = "info"

[publishing.platforms.devto]
language = "en"
```

请通过工作台配置真实密钥，不要将数据目录提交至 Git。

## 统一索引站点配置

在 **设置 → 搜索引擎 → 索引站点与 URL** 中编辑；索引页只读取并展示保存后的配置。

```toml
[search]
site_origin = "https://thinkerqaq.com"
url_list_url = "https://thinkerqaq.com/sitemap-all.txt"
sitemap_url = "https://thinkerqaq.com/sitemap-index.xml"
fingerprint_url = "https://thinkerqaq.com/sitemap-inventory.json"
google_property = "sc-domain:thinkerqaq.com"
```

TXT、XML 和指纹清单必须属于配置的域名，Google Property 必须覆盖该站点。指纹清单可显式留空，表示不读取指纹；此时增量会保守地把已有 URL 视为变化。其余必填字段缺失、类型错误、未知 `[search]` 字段或跨域地址会被明确拒绝，不会退回硬编码站点。

旧配置在 Bridge 启动时自动写入 `[search]` 默认值，并移除重复的 `baidu_site`；现有凭据不变。刷新、IndexNow、百度、Google API、浏览器 Request Indexing 和 CLI 共用这份配置。控制台入口由域名和 Google Property 派生。`--site-url` 必须与配置的 Google Property 一致。

运行中的索引任务完成前不能修改站点；任务保存自己的站点身份，配置变化后旧任务不能盲目重放。改域名不会向新站点提交旧域名的删除通知，旧 Google 请求队列也不会继续执行。

配置指定的是要索引的站点。它不会自动修改 DNS、部署站点或变更 Astro 页面中的 canonical；配置的公开资源地址必须实际存在。
