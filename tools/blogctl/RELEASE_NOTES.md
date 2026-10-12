# BlogCTL v0.1.150

Native browser registration is now built into the BlogCTL executable.

- Added `blogctl install` and `blogctl uninstall` on Windows, Linux and macOS.
- Removed the six standalone Install/Uninstall scripts from the repository and release archives.
- On Windows, `install` registers the Chrome and Edge Native Messaging host under the current user and writes the host manifest beside the executable in `Data/`.
- On Linux and macOS, `install` manages Chrome, Chromium and Edge Native Messaging manifests in the user profile.
- `uninstall` removes the host registration without deleting downloads, user configuration or the browser extension.
- Refreshed English and Chinese setup guides and added isolated install/uninstall checks.

## Upgrade

Download the matching BlogCTL v0.1.150 executable and the extension archive. Preserve the existing `Data/` directory and place the binary in its intended installed location. Then run:

```text
blogctl install
```

On Windows, invoke the actual file (for example `blogctl-windows-amd64.exe install`); Linux/macOS use their matching executable names. Reload the unpacked Extension. To unregister later, use the same executable with `uninstall`.

No migration of `blogctl.toml`, sessions or other user data is required.

[English setup guide](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/blob/main/tools/blogctl/docs/tutorial/first-run-on-new-machine.md) · [中文入门教程](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/blob/main/tools/blogctl/docs/zh-CN/tutorial/first-run-on-new-machine.md)
