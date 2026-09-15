---
title: "2.1 Prometheus"
description: "Prometheus architecture: pull-based scraping, exporters, TSDB, rule evaluation, Alertmanager, and the limited role of Pushgateway."
translationOf: "observability/prometheus"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. What Is Prometheus?

Prometheus is a metrics-oriented monitoring and alerting system. It collects time-series data by scraping HTTP metrics endpoints and provides PromQL, rule evaluation, and a local TSDB.

## 2. Core Architecture

### 2.1. Prometheus Server

The Prometheus server:

- discovers and scrapes targets according to configuration
- stores time-series samples
- queries data with PromQL
- evaluates recording rules and alerting rules

The default Prometheus collection model is **pull / scrape**.

### 2.2. Exporters

When a target does not natively expose Prometheus-format metrics, an exporter can translate system or middleware metrics into an HTTP endpoint that Prometheus can scrape.

Node Exporter, for example, exposes hardware and kernel metrics from Linux / Unix hosts.

### 2.3. Pushgateway

Pushgateway is not a general-purpose proxy for situations where Prometheus cannot reach a target. The official guidance recommends it only for limited cases, especially **short-lived service-level batch jobs**.

Routing normal long-lived services through Pushgateway removes the normal `up` health semantics provided by scraping and requires additional cleanup of stale series.

### 2.4. Alertmanager

Prometheus evaluates alerting rules. When an alert fires, it is sent to Alertmanager, which handles grouping, routing, silencing, inhibition, and notification delivery.

### 2.5. Grafana

Grafana can use Prometheus as a data source and build dashboards with PromQL. Grafana is neither required by Prometheus nor the underlying Prometheus metric store.

## 3. Where Prometheus Fits

Prometheus is well suited to machine metrics, service metrics, and numeric time series in dynamic service-oriented environments.

It prioritizes reliability during failures rather than acting as a perfectly complete business ledger. If a use case such as per-request billing requires 100% accurate and complete records, use a dedicated source-of-truth data system and use Prometheus for monitoring.

## 4. References

- [Prometheus overview](https://prometheus.io/docs/introduction/overview/)
- [When to use the Pushgateway](https://prometheus.io/docs/practices/pushing/)
- [Alerting overview](https://prometheus.io/docs/alerting/latest/overview/)
