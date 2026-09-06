# 博客图表约定

## 工具选择

- draw.io：架构图、文章主图、需要手工布局和强调关系的图。
- Mermaid：简单流程图、时序图和经常随代码变化的图。接入文章渲染前先作为辅助创作工具使用。
- PlantUML：继续支持 Markdown 中已有的 `puml` / `plantuml` 代码块。

## draw.io 工作流

1. 使用 draw.io Desktop 创建或编辑图。
2. 将源文件保存到 `src/diagrams/drawio/`，允许建立子目录。
3. 运行 `npm run diagrams:drawio`。脚本只重新导出新增或发生变化的图。
4. 将 `.drawio`、生成的 `.svg` 和 `src/data/drawio-manifest.json` 一起提交。
5. 在 Markdown 中引用 `/diagrams/drawio/<路径>.svg`。

例如：

```text
src/diagrams/drawio/agent/execution-loop.drawio
public/diagrams/drawio/agent/execution-loop.svg
```

```markdown
![Agent 执行循环](/diagrams/drawio/agent/execution-loop.svg)
```

网站只发布静态 SVG，不在浏览器中加载 draw.io 或外部渲染服务。SVG 没有嵌入 `.drawio` 源数据，源文件单独保留在仓库中。

## 本地环境

渲染需要安装 draw.io Desktop。脚本会依次检查：

- `DRAWIO_EXECUTABLE` 环境变量；
- 系统 `PATH` 中的 `drawio` / `draw.io`；
- Windows 和 macOS 的常见安装位置。

当前电脑上的便携版 `C:\software\Office\DrawioPortable\App\Drawio\draw.io.exe` 也会被自动识别。

如果安装在自定义位置，可以在 PowerShell 中指定：

```powershell
$env:DRAWIO_EXECUTABLE = 'D:\\Apps\\draw.io\\draw.io.exe'
npm run diagrams:drawio
```

`npm run check:drawio` 不调用 draw.io，只检查源文件、SVG 与清单是否一致。GitHub Actions 的 `CI=true` 环境会自动使用这个只读模式，因此线上构建不需要安装 draw.io Desktop。
