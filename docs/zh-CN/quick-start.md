# 快速开始

使用仓库自带的示例内容，在本机启动博客。不需要访问私有内容仓库，也不需要云服务密钥。

## 环境要求

安装 Node.js 22+、Go 1.27.1、npm 和 Git。

## 运行

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

浏览器打开 [http://localhost:4321](http://localhost:4321)。

`dev:quick` 先从 `fixtures/` 装配内容，再启动 Astro。为了减少首次启动的依赖，它跳过 Mermaid、PlantUML 等图表预渲染，因此部分图表不会显示。

## 检查

在另一个终端执行：

```bash
npm run check
```

需要验证完整构建时，再安装 Java 17+、Graphviz（`dot`）和 Mermaid 所用的无头 Chromium：

```bash
npm run dev
npm run test
```

图表渲染失败时先检查 `java -version` 和 `dot -V`。下一步可以通过[教程](tutorial/first-site.md)接入独立的内容仓库。
