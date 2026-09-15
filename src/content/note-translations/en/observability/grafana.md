---
title: "3.1 Grafana"
description: "Grafana basics: starting the service, first login, adding Prometheus as a data source, and building dashboards with PromQL."
translationOf: "observability/grafana"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. What Is Grafana?

Grafana is a visualization and observability platform that connects to data sources such as Prometheus and uses queries to build dashboards, panels, and alerts.

Grafana itself is not the original storage for Prometheus metrics; the corresponding data source continues to store the data.

## 2. Installation and Startup

Grafana can be deployed through system packages, standalone binaries, Docker, or Kubernetes.

For an official standalone binary, use the startup command and directory layout documented for the current release. In production, systemd, containers, or an orchestrator are preferable to manually running a binary as a long-lived process.

## 3. First Login

The default web address is normally:

```text
http://localhost:3000
```

The default local administrator credentials are commonly `admin / admin`, after which Grafana prompts you to change the password. Do not keep the default password in production.

## 4. Add Prometheus as a Data Source

Add a Prometheus data source in Grafana and configure the Prometheus server URL. For a local experiment:

```text
http://localhost:9090
```

Once connected, Prometheus-backed panels use PromQL expressions such as:

```promql
rate(http_requests_total[5m])
```

## 5. What Dashboards Are For

A dashboard can organize operational signals such as:

- request volume
- P50 / P95 / P99 latency
- error rate
- CPU / memory / disk
- dependency health

Dashboards should support concrete operational goals and debugging workflows rather than simply accumulating charts.

## 6. References

- [Install Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/installation/)
- [Sign in to Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/sign-in-to-grafana/)
- [Prometheus data source](https://grafana.com/docs/grafana/latest/datasources/prometheus/)
