# BlogCTL Publishing Language

## Goal

Make the content language a persistent per-platform publishing policy.

Users configure the language once under **发布配置**. The sync page does not ask for a language on every run.

## Configuration model

Each platform publishing profile gains:

```json
{
  "language": "zh-CN"
}
```

Supported values:

- `zh-CN` — use the canonical Chinese article.
- `en` — use the English mirror.

There is deliberately no `auto` mode. Publishing behavior should be explicit and predictable.

Default values:

| Platform | Default |
| --- | --- |
| 博客园 | zh-CN |
| 掘金 | zh-CN |
| CSDN | zh-CN |
| 思否 | zh-CN |
| 知乎 | zh-CN |
| 51CTO | zh-CN |
| 开源中国 | zh-CN |
| 今日头条 | zh-CN |
| DEV.to | en |
| Medium | en |

Existing config files remain valid. Missing `language` values are filled from these defaults.

## Source resolution

Language controls the complete source article, not only the body.

For slug `example`:

```text
zh-CN -> BLOG_CONTENT_ROOT/src/content/articles/example.md
en    -> BLOG_CONTENT_ROOT/src/content/articles/en/example.md
```

The selected source provides title, description, tags, and body as one unit.

If a configured source does not exist, that platform is unavailable for the selected article and the UI reports the missing language version.

There is no hard-coded rule that DEV.to or Medium must use English. Their defaults are English, but users may configure them to `zh-CN`.

## Canonical URL

Canonical and Footer URLs follow the configured content language:

```text
zh-CN -> https://thinkerqaq.github.io/articles/<slug>/
en    -> https://thinkerqaq.github.io/en/articles/<slug>/
```

Footer templates and tracking remain platform policy. Changing the content language does not silently rewrite a custom Footer template.

## Sync behavior

The sync request continues to identify only:

- article slug
- target platforms

The publishing profile resolves language internally for each platform.

Mixed-language selections are valid. For example:

```text
掘金   -> zh-CN
DEV.to -> en
Medium -> zh-CN
```

Each adapter reads the appropriate source for its own platform.

## UI

**发布配置** adds a `内容语言` select directly below the platform select.

Options:

- 中文
- English

The preview uses a language-matching example canonical URL and site/title placeholders.

The **同步发布** page uses the saved platform policy when determining whether a platform is available for the selected article.

## Compatibility

- Existing config JSON is migrated by default filling; no destructive migration is needed.
- Existing CLI sync syntax is unchanged.
- `language` is validated as `zh-CN` or `en`.
- Current Footer, Canonical, Tracking, draft creation, and login/session behavior remain otherwise unchanged.

## Verification

Add coverage for:

1. Go config defaults, persistence, normalization, and publishing API views.
2. Extension publishing form read/write/reset behavior.
3. Platform availability based on configured language rather than platform identity.
4. Chinese-platform distribution using either Chinese or English source.
5. DEV.to and Medium using either Chinese or English source.
6. Canonical/Footer URLs matching the selected language.
7. Backward-compatible loading of config files without `language`.

## Out of scope

The draft-review-publish state machine and the final incremental-sync model are separate work. This change only makes language selection explicit and consistent across the existing draft-first flow.
