# Analytics range API

The blog AI Worker owns all analytics queries and KV access. GitHub Actions does not query KV or hold a KV read token. The Worker cron still collects finished hourly windows and the previous two complete calendar weeks from Umami.

## Endpoints

All three endpoints accept `start` and `end` together. Both endpoints of a range are **inclusive bucket labels**, and the response's `range.startAt`/`range.endAt` are Unix milliseconds, inclusive. If both query parameters are omitted:

| Route | Boundary format | Default window | Maximum |
| --- | --- | --- | --- |
| `/analytics/hour-range` | ISO-8601 hour **with timezone** | Previous full hour | 48 hours |
| `/analytics/day-range` | `YYYY-MM-DD` in Asia/Shanghai (+08:00) | Today, up to now | 31 days |
| `/analytics/weekly-range` | `YYYY-MM-DD` **Monday** in Asia/Shanghai | Previous complete Monday–Sunday week | 12 weeks |

Examples:

```text
/analytics/hour-range?start=2026-10-10T00:00:00Z&end=2026-10-10T03:00:00Z
/analytics/day-range?start=2026-10-08&end=2026-10-10
/analytics/weekly-range?start=2026-09-28&end=2026-10-05
```

The `/analytics/health` endpoint is unchanged, as is the separate Bot observation endpoint. Old `/analytics/hourly`, `/analytics/today`, and `/analytics/weekly` routes return 404.

## Report contract

The response contains `granularity`, `timezoneOffsetMinutes`, `range`, `generatedAt`, `source` (`kv` or `umami`), and `window`. `window` has `stats`, `paths`, `entryPages`, `referrers`, `channels`, `countries`, `events`, `utmSources`, and `warnings`. Region and city data are stripped from the public response.

**Visitors are deduplicated across the entire requested window by a single Umami stats request**; no code adds hourly or daily unique-visitor counts. Requests that are still in progress are clipped to the current time.

## Storage and freshness

The Worker reuses Cron-written hourly and weekly snapshots when the request exactly matches one finished bucket. Other finished ranges are fetched from Umami and cached in KV for **7 days**. Recent/unfinished windows stay in the edge response cache for 60 seconds and are not persisted as stable snapshots.

On the Workers KV Free plan, the documented limits are 1 GB storage and 1,000 writes/day. The 7-day expiry limits stored-history growth and historical ranges can be recollected from Umami. KV write failure does not replace an otherwise valid Umami report with fabricated zeroes.

## Verification

```bash
node --test workers/blog-ai/src/*.test.js
```

The Worker release workflow verifies the three range endpoints and `/analytics/health` against production after deployment.
