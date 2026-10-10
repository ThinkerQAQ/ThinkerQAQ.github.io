# 排查 Bridge 与扩展连接

## 1. 检查本地服务

在 Windows PowerShell 执行：

```powershell
Invoke-RestMethod http://127.0.0.1:32145/v1/health
```

如果无法连接，检查可执行文件路径、Native Messaging 注册信息和 Bridge 进程。

## 2. 检查浏览器扩展

打开 `edge://extensions` 或 `chrome://extensions`，确认 BlogCTL 扩展启用且版本与 Bridge 匹配。更新扩展后重新加载。

## 3. 查看工作台

点击「打开工作台」，检查页面顶部的连接状态。Web Console 依赖扩展转发身份受限的请求，仅能打开网页不代表连接完成。

在「日志」和「任务」中检查错误信息，不要将 Cookie、Token 或个人会话导出到日志。

## 4. 开发环境

在博客引擎根目录执行：

```bash
devtool config validate
devtool project inspect --json
```

状态正常后再次打开「检测」读取平台文章；如仍失败，查[Bridge 模型](../concepts/bridge-and-state.md)和[配置参考](../reference/configuration.md)。
