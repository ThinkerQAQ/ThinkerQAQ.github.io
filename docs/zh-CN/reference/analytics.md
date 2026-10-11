# Analytics 时间范围查询接口

统计数据由 **Worker Cron → Umami → Workers KV** 负责采集与缓存。请求同样由 Worker 处理；GitHub Actions 不直接读取 KV，也不需要新增 KV Read Token。

## 接口

三个接口均使用 `start` 和 `end`，必须一起提供，或同时省略。起止值均表示**包含该时间桶**，返回值的 `range.startAt`、`range.endAt` 为包含终点的 Unix 毫秒时间戳。

| 接口 | 时间格式 | 省略参数时 | 最大范围 |
| --- | --- | --- | --- |
| `/analytics/hour-range` | 带时区的 ISO-8601 整点 | 上一个完整小时 | 48 小时 |
| `/analytics/day-range` | `YYYY-MM-DD`，东八区自然日 | 今天零点到当前时间 | 31 天 |
| `/analytics/weekly-range` | `YYYY-MM-DD`，东八区周一 | 上一个完整周（周一到周日） | 12 周 |

示例：

```text
/analytics/hour-range?start=2026-10-10T00:00:00Z&end=2026-10-10T03:00:00Z
/analytics/day-range?start=2026-10-08&end=2026-10-10
/analytics/weekly-range?start=2026-09-28&end=2026-10-05
```

`/analytics/health` 和独立的 Bot 观察接口保持不变。原 `/analytics/hourly`、`/analytics/today`、`/analytics/weekly` 返回 404。

## 统计语义

响应包含 `granularity`、`timezoneOffsetMinutes`、`range`、`generatedAt`、`source`、`window`。

`window` 提供 `stats`、`paths`、`entryPages`、`referrers`、`channels`、`countries`、`events`、`utmSources`、`warnings`，对外不会返回地区和城市明细。

**UV、Visits 等由 Umami 按整个时间范围直接聚合**，不把多个小时的独立访客相加。当天和本周尚未结束的时间范围会截断到查询时刻。

## 存储与缓存

完整小时和完整周优先复用 Cron 已写入的 KV 记录；其他完整区间按需请求 Umami，并写入 KV 缓存 **7 天**。仍在变化的近期统计只走 60 秒边缘缓存，不当作长期快照。

Cloudflare KV 免费配额标称为 1 GB 容量、每天 1,000 次写入。7 天 TTL 控制缓存长期增长；过期历史范围仍可向 Umami 重新查询。缓存写入失败时保留真实 Umami 查询结果，避免显示错误的零流量。

## 验证

```bash
node --test workers/blog-ai/src/*.test.js
```

部署流水线会验证三个 range 接口和 `/analytics/health` 的真实响应。
