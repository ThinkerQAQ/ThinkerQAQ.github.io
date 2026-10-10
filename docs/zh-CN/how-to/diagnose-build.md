# 排查本地构建失败

先确定失败位于依赖安装、内容装配、Astro 检查还是图表渲染。

## 基础检查

在引擎根目录运行：

```bash
devtool config validate
devtool project inspect --json
devtool code doctor
npm run assemble:fixtures
npm run check
```

`assemble:fixtures` 失败时检查 Go 版本和内容路径。Astro 类型检查失败时根据报错定位到页面或集合 Schema。

## 图表渲染

完整构建需要 Java 17+、Graphviz 和无头 Chromium。检查：

```bash
java -version
dot -V
npm run diagrams
```

只需先看到页面，可以执行 `npm run dev:quick`，暂时跳过图表预渲染。

Go/BlogCTL 的项目校验应按 DevTool 已声明的 `verify` 能力执行。如果环境 Provider 不可用，应报告真实失败原因，不以其他检查结果代替。更多命令见[参考手册](../reference/commands.md)。
