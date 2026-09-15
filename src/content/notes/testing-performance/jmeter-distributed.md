---
title: "4.1 JMeter 分布式压测"
description: "JMeter controller/worker 分布式负载测试、CLI 执行、RMI 网络要求、版本一致性和结果收集注意事项。"
sourcePath: "Test/Jmeter/Jmeter分布式压测.md"
category: "testing-performance"
categoryLabel: "Testing & Performance"
topic: "tooling"
topicLabel: "4.Tooling"
order: 5
tags: ["JMeter", "Distributed Testing", "Load Testing"]
updatedAt: "2026-09-15T03:15:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 什么时候需要分布式压测

当单台负载生成机受 CPU、内存或网络能力限制，无法产生目标流量时，可以用一个 JMeter controller 控制多个 worker。

要注意：JMeter remote testing 会让**每个 worker 执行完整测试计划**。例如测试计划定义 1,000 个线程，6 个 worker 会产生约 6,000 个线程，而不是自动把 1,000 个线程平均分配。

## 2. 节点要求

controller 和 worker 应保持：

- 完全相同的 JMeter 版本；
- 尽量相同的 Java 版本；
- 相同的插件和自定义 JAR；
- worker 可访问被测系统；
- CSV 等外部数据文件已正确放到各 worker，因为测试计划会下发，但数据文件不会自动随测试计划分发。

JMeter remote testing 基于 RMI。应正确配置网络端口和 RMI SSL；只有在可信隔离网络并明确接受风险时才考虑关闭 SSL。

## 3. 启动 worker

每个 worker 上启动：

```bash
jmeter-server
```

如果防火墙存在，需要为 RMI registry、server engine 和返回结果所需端口建立明确规则。可以通过 `server.rmi.localport`、`client.rmi.localport` 等属性把动态端口范围收敛到可管理范围。

## 4. 从 controller 执行

负载测试应使用 CLI 模式，GUI 主要用于创建和调试测试计划。

指定 worker：

```bash
jmeter -n \
  -t test-plan.jmx \
  -R load-1.example.net,load-2.example.net \
  -l results.jtl \
  -e \
  -o report
```

也可以在 `remote_hosts` 中配置 worker，然后使用 `-r`。

常用参数：

- `-n`：CLI mode；
- `-t`：测试计划；
- `-l`：结果文件；
- `-R`：本次使用的远程 worker；
- `-e -o`：测试结束后生成 HTML report；
- `-X`：测试结束后请求远程 server 退出。

## 5. 分布式压测的额外瓶颈

controller 需要接收各 worker 的结果，本身也可能成为瓶颈。大规模压测时应：

- 减少不必要的 listener 和样本字段；
- 避免在 GUI 下执行正式压测；
- 监控 controller 与 worker 的 CPU、内存和网络；
- 确认负载生成器没有先于被测系统饱和；
- 在报告中记录负载生成器规模和配置。

只有先证明发压端稳定，测试结果才可以用于判断被测系统的容量。
