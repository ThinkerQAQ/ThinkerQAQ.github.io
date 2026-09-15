---
title: "2.2 Prometheus Setup and Node Exporter"
description: "Run Prometheus and Node Exporter locally and configure a minimal scrape target."
translationOf: "observability/prometheus-setup"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. Start Prometheus

Download the current build for your platform from the official download page and extract it:

```bash
tar xvfz prometheus-*.tar.gz
cd prometheus-*
./prometheus --config.file=./prometheus.yml
```

Prometheus listens on `localhost:9090` by default.

In current versions, PromQL can be explored from the query page of the Prometheus web UI:

```text
http://localhost:9090/query
```

UI routes can change between versions, so prefer the current official documentation.

## 2. Start Node Exporter

Node Exporter exposes hardware and kernel metrics from Linux / Unix hosts.

```bash
tar -xvf node_exporter-*.tar.gz
cd node_exporter-*
./node_exporter
```

It listens on `localhost:9100` by default. Verify the metrics endpoint directly:

```bash
curl http://localhost:9100/metrics
```

## 3. Configure Prometheus to Scrape Node Exporter

Edit `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["localhost:9100"]
```

After reloading or restarting Prometheus, inspect the Targets page:

```text
http://localhost:9090/targets
```

You can then query metrics prefixed with `node_`, for example:

```promql
node_filesystem_avail_bytes
```

## 4. Production Considerations

The commands above are appropriate for learning and local experiments. Production environments usually also need:

- process management through systemd, containers, or an orchestrator
- explicit retention and disk-capacity planning
- service discovery, alerting rules, and access controls
- a controlled configuration reload / rollout process

## 5. References

- [First steps with Prometheus](https://prometheus.io/docs/introduction/first_steps/)
- [Monitoring Linux host metrics with Node Exporter](https://prometheus.io/docs/guides/node-exporter/)
