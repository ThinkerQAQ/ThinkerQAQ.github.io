---
title: "1.1 JetBrains"
description: "JetBrains / GoLand notes covering shortcuts and shared indexes."
translationOf: "developer-tools/jetbrains"
language: "en"
updatedAt: "2026-09-15T11:40:00Z"
---
## 1. GoLand
### 1.1. Shortcuts
example  
F1 quick doc  
ctrl+f2 change signature  
extend selection  
.err .var  
alt+enter automatically creates a variable

### 1.2. Shared Indexes

#### 1.2.1. Environment Setup (Optional)

The original note recorded the GoLand 2022 workflow based on `idea.properties`, `dump-shared-index`, and `cdn-layout-tool`. That command-line interface has changed.

The current JetBrains Shared Indexes tool provides a standalone CLI. Download the version that matches the current IDE and prepare the IDE and project paths:

```cmd
ij-shared-indexes-tool-cli.bat boost --ij <IDE_PATH> --project <PROJECT_PATH>
```

Do not hard-code a personal `TEMP` directory, Toolbox version directory, or machine-specific path.

#### 1.2.2. Export Project Indexes

```cmd
ij-shared-indexes-tool-cli.bat indexes ^
  --ij <IDE_PATH> ^
  --project <PROJECT_PATH> ^
  --base-url https://<INDEX_SERVER>/goland ^
  --data-directory <INDEX_DATA_DIR>
```

Refer to the current JetBrains documentation for the exact options.

#### 1.2.3. Create Shared-Index Metadata

The old note used `cdn-layout-tool` separately to create metadata. The current Shared Indexes CLI generates the uploadable index data, so the old fixed command should not be retained.

#### 1.2.4. Upload Shared Indexes to a CDN Server

1. Prepare a file server reachable over HTTP/HTTPS.
2. Upload the generated shared-index directory.

Do not publish private IP addresses, internal domains, or local absolute paths.

#### 1.2.5. Use the Indexes

The exact project configuration, plugins, and file format can change with IDE versions. The core workflow remains:

```text
generate indexes → upload to index server → IDE downloads and reuses shared indexes
```

## 2. References
- [Shared indexes | IntelliJ IDEA](https://www.jetbrains.com/help/idea/shared-indexes.html)
