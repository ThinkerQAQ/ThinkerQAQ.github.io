# BlogCTL Configuration Reference

**Authority:** [`bridge/config.go`](../../bridge/config.go) (`bridgeConfig`, defaults, paths) and [`publishing/config.go`](../../publishing/config.go) (`Config` and platform defaults). These Go structs and `toml` tags are the source of truth; the table below is a human lookup, not a separate schema.

## Storage contract

| Platform | Default user-data directory |
| --- | --- |
| Windows | `Data/` next to the installed executable |
| Linux / macOS | `os.UserConfigDir()/BlogCTL` |
| All | Absolute `BLOGCTL_DATA_DIR` environment override |

Only `blogctl.toml` is user configuration. `jobs.json`, `publications.json`, `distribution/`, logs and similar files are runtime data, not hand-edited config. Changing the Windows executable location may change the default Data path. Back up Data before relocation; migration is not automatic.

**Interface language:** `ui_locale = "auto"` by default; alternatives are `zh-CN` and `en`. This is separate from per-platform article language. See [the language How-to](../how-to/switch-interface-language.md).

## Top-level TOML fields

| Key | Meaning |
| --- | --- |
| `content_root`, `engine_root` | Canonical content and public engine checkouts |
| `distribution_root`, `publication_bindings_path` | Optional persistent state path overrides |
| `log_directory`, `log_level` | Logging |
| `proxy_enabled`, `proxy_host`, `proxy_port` | HTTP proxy behavior |
| `tool_paths` | Executable path overrides (map) |
| `devto_api_key` | DEV.to credentials |
| `indexnow_endpoint`, `indexnow_key`, `indexnow_key_location` | IndexNow |
| `baidu_token` | Baidu submission; site identity comes from `[search]` |
| `google_search_console_service_json` | Google Search Console credentials |

## Shared search site configuration

Configure **Settings → Search engines → Indexing site and URLs**. The indexing page displays these saved values and derives provider console links from them; it has no separate editable URL settings.

```toml
[search]
site_origin = "https://thinkerqaq.com"
url_list_url = "https://thinkerqaq.com/sitemap-all.txt"
sitemap_url = "https://thinkerqaq.com/sitemap-index.xml"
fingerprint_url = "https://thinkerqaq.com/sitemap-inventory.json"
google_property = "sc-domain:thinkerqaq.com"
```

All resource URLs must belong to `site_origin`. The Google property must cover that site. An empty `fingerprint_url` explicitly disables fingerprint fetching; incremental submission then conservatively treats existing URLs as changed. Missing required fields, wrong types, unknown `[search]` keys, foreign URLs and incompatible properties are rejected with the configuration path.

The Bridge migrates an existing configuration without `[search]` to the previous site defaults on startup and writes the explicit section. The obsolete `baidu_site` field is removed; Baidu uses the shared origin. Existing provider credentials remain unchanged. Changing the executable/data location is still a separate manual migration.

Inventory refresh, IndexNow, Baidu, Google Sitemap, URL Inspection, browser Request Indexing and CLI search commands consume the same site configuration. A CLI `--site-url` selection must match the configured Google property. Running search tasks prevent site edits; queued/retried tasks carry their site configuration and reject a changed identity. Domain migrations reset the active inventory view and exclude old-origin snapshots and queue entries from new requests. Provider API endpoints, authentication protocols and batch limits remain provider-owned rules.

This configuration identifies the site to index; the site's deployed resources must actually exist at the configured addresses. It does not itself change DNS or deploy the site's canonical URLs.

## Publishing fields

| TOML section | Contract |
| --- | --- |
| `[publishing.compiler.mermaid]` | `format` (default `png`), `width` (1200), `scale` (2) |
| `[publishing.assets]` | `store` (default `r2`) |
| `[publishing.assets.r2]` | `bucket`, `public_base_url`, `access_key_id`, `secret_access_key`, `account_id`, `endpoint` |
| `[publishing.platforms.PLATFORM]` | `language`, `changed_only` |
| `[publishing.platforms.PLATFORM.footer]` | `enabled`, `template` |
| `[publishing.platforms.PLATFORM.canonical]` | `mode` |
| `[publishing.platforms.PLATFORM.tracking]` | `enabled`, `source`, `medium`, `campaign` |

Defaults are created by `DefaultConfig()` and `DefaultPlatformConfig()`; DEV.to and Medium default to English and native canonical links, while other platforms use their registered default languages. Exact supported IDs come from [`platform/capabilities.go`](../../platform/capabilities.go).

## Social publishing

```toml
[social.buffer]
api_key = "YOUR_PERSONAL_BUFFER_API_KEY"
```

The key is a local secret masked from Bridge API config responses. Buffer-connected
channels are discovered by API; only specifically requested platforms are used.
See [Social Publishing](../guide/social-publishing.md) for the ChatGPT/WSL/Console workflow,
approval steps, and sharing the same Data directory across Windows and WSL.

## Minimal example (paths are examples)

```toml
engine_root = "/home/user/blog/ThinkerQAQ.github.io"
content_root = "/home/user/blog/blog-content"
log_level = "info"

[publishing.compiler.mermaid]
format = "png"
width = 1200
scale = 2

[publishing.platforms.devto]
language = "en"
changed_only = false
```

Use the Extension **设置** UI to modify credentials. Do not commit a real `blogctl.toml`, private key, cookie or service account JSON.
