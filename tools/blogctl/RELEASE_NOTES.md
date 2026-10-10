# BlogCTL v0.1.149

Stable release — interface language moved into Settings.

- Added **Settings → Interface & language** (设置 → 界面与语言) as a discoverable category with **Follow browser language**, **Simplified Chinese**, and **English** options.
- Removed the language selector from the top toolbar. The Extension and Web Console still share a single selector and the existing `ui_locale` value in `blogctl.toml`.
- Selection changes are applied immediately and saved through the existing authenticated Bridge API. An unavailable Bridge causes the choice to roll back with a visible error message.
- The article publishing language under each platform's configuration is unchanged. CLI flags, Go APIs, and the underlying task workflow are not affected.
- Updated the English and Chinese guides. Browser-based UI checks covered both locales and failure rollback; Extension and documentation regression checks passed.

## Upgrade

Download BlogCTL v0.1.149 for your platform, **preserve the executable's `Data/` directory**, replace the binary, and reload the unpacked browser Extension. Existing `ui_locale` preferences remain valid. No data migration is required.

[English setup guide](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/blob/main/tools/blogctl/docs/tutorial/first-run-on-new-machine.md) · [中文入门教程](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/blob/main/tools/blogctl/docs/zh-CN/tutorial/first-run-on-new-machine.md)
