# 配置

以 [bridge/config.go](../../../bridge/config.go) 和 [publishing/config.go](../../../publishing/config.go) 定义为准。

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
