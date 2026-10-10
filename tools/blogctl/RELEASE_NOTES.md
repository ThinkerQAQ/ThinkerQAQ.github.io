# BlogCTL v0.1.148

Stable release — bilingual BlogCTL interface and documentation.

## What's new

- **English / Simplified Chinese / Auto** in both the browser Extension and Web Console, using the same locally bundled translation resources. The selected interface language is stored as `ui_locale` in `blogctl.toml` and does not change the language of articles published to third-party platforms.
- Localized navigation, workspace settings, article detection, creation, updates, indexing and task status. The browser Extension's name and description also follow Chrome/Edge's native language selection. Technical logs, user content, command names and machine-readable fields remain unchanged.
- CLI help can be displayed in English or Chinese using `BLOGCTL_LANG=en` or `BLOGCTL_LANG=zh-CN` (or the saved preference).
- The blog engine now has separate Chinese (`/rss.xml`) and English (`/en/rss.xml`) feeds and only creates English note routes when a translation exists.
- English and Chinese first-run tutorials walk through a fresh install, Bridge connection and the read-only Detect → Create / Update → Tasks workflow. Includes three real English Web Console screenshots.

## Install / upgrade

Download the appropriate Windows, Linux or macOS artifact and its installer from this release. On Windows, keep the `Data/` directory beside the executable when upgrading, then reload the browser Extension.

This release does not require a configuration migration. Existing installations default to `ui_locale = "auto"` until a language is explicitly chosen.

See [BlogCTL Quick Start](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/blob/main/tools/blogctl/docs/quick-start.md) or [中文上手教程](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/blob/main/tools/blogctl/docs/zh-CN/tutorial/first-run-on-new-machine.md).

## Verification

DevTool verification, Go package tests, browser-Extension regression tests, Astro checks, document-link checks and live local HTTP checks were run on the feature branches. The browser screenshots show an isolated clean Bridge; authenticated third-party publishing was not performed during the documentation smoke test.
