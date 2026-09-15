---
title: "Designing Metrics Monitoring"
description: "Metric naming/types, labels, cardinality control, RED/USE signals, SLOs, aggregation, and alerting."
translationOf: "software-engineering/Architecture/架构模式/微服务/如何设计metrics监控"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

Metrics compress system behavior into numeric time series. Use counters for cumulative events, gauges for current state, and histogram-style distributions for latency/size rather than averaging away tails.

Monitor user-facing RED signals (rate, errors, duration) and resource USE signals (utilization, saturation, errors). Build alerts from actionable SLO/risk symptoms rather than every metric threshold.

Control label cardinality: request IDs, user IDs, raw URLs, or unbounded values can make the metrics backend itself fail.