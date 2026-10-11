# 排查 Umami 访问量为空

统计无数据时，按“页面有没有加载脚本 → 是否发送事件 → Worker 是否接收 → Dashboard 是否展示”顺序排查。

## 检查步骤

1. 打开普通文章页，在浏览器 Network 中检查本站静态文件 `/u.js`（期望 HTTP 200）。[`BaseLayout.astro`](../../../src/layouts/BaseLayout.astro) 需要网站 ID 与代理源配置才会加载脚本。
2. 分别检查本站 `GET /u.js` 和外部采集服务 `POST /api/send` 的状态码、跨域与网络错误。
3. 检查当前浏览器是否通过站内[统计控制页](../../../src/pages/disable-analytics.astro)关闭了追踪。
4. 对照部署环境中的 `PUBLIC_UMAMI_WEBSITE_ID`、`PUBLIC_UMAMI_PROXY_ORIGIN` 与 Dashboard 的网站和时间范围。
5. 如果请求成功但没有统计，查看 Worker 事件处理与报表过滤。HTTP 200 只能说明请求到达某个接口，不代表事件最终入库。

验证时使用允许追踪的测试浏览器，检查同一网站、同一时间范围中是否出现对应事件。避免将访客标识、密钥或请求凭据粘贴到公开日志。
