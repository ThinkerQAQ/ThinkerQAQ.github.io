# Quick Start — BlogCTL

**Outcome:** validate a working BlogCTL local executable and open the Extension/Console. Site building can be explored without a publishing account.

## 1. Obtain the application

Download the current artifacts from [GitHub Releases](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/releases/latest). Match your OS/architecture and keep the executable, Extension archive contents, and installer together. On Windows, preserve the `Data/` directory across upgrades.

Or build from source from the engine root:

```bash
go build -o blogctl ./tools/blogctl/cmd
./blogctl help
./blogctl doctor
```

The release binary does not require Go, but site builds require Node/npm and other renderers as documented in the [CLI reference](reference/cli.md).

## 2. Register the browser Bridge (Windows)

From the directory containing the packaged installer:

```powershell
.\Install-Windows.ps1 -Executable C:\software\Coding\blogctl\blogctl-windows-amd64.exe
```

Use the corresponding `Install-Linux.sh` or `Install-macOS.command` for other platforms; see the release package.

## 3. Load the Extension

In `edge://extensions` or `chrome://extensions`, enable developer mode, load the unpacked `extension` directory and open BlogCTL. Extension and Bridge versions should agree. If the Extension was updated, click Reload.

Use **打开工作台** for the shared Web Console at `http://127.0.0.1:32145/console/`. The Console requires the installed Extension to relay restricted operations; a static page alone cannot authorize publishing.

## 4. Validate the connection

From PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:32145/v1/health
```

In the UI, use **检测** to read a supported platform session or inspect **日志**. Detection must not create remote content. Credentials can be configured via **设置** when needed.

## 5. Success and next steps

The local health endpoint responds, the Extension shows a connected Bridge and the Console opens. Follow the [first workflow tutorial](tutorial/first-publish.md), [workspace How-to](how-to/configure-workspace.md) or [configuration reference](reference/configuration.md).
