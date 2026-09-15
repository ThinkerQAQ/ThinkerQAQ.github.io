---
title: "2.2 Prometheus Installation"
description: "Prometheus and Node Exporter installation and basic configuration."
translationOf: "observability/prometheus-setup"
category: "observability"
categoryLabel: "Observability"
topic: "prometheus"
topicLabel: "2.Prometheus"
order: 3
tags: ["Prometheus", "Node Exporter"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. Download Prometheus
- [Download | Prometheus](https://prometheus.io/download/)

## 2. Extract and Start Prometheus
```bash
tar xvfz prometheus-*.tar.gz
cd prometheus-*
./prometheus
```

## 3. Open in the Browser
- http://localhost:9090/
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624711860_20210626204440546_16939.png)

## 4. Install Node Exporter
### 4.1. Download Node Exporter
- [Download | Prometheus](https://prometheus.io/download/)

### 4.2. Extract and Start Node Exporter
```bash
tar -xvf node_exporter-*.tar.gz
cd node_exporter-*
./node_exporter
```

### 4.3. Configure Prometheus
Edit `prometheus.yml`:

```yaml
scrape_configs:
  # ...
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

### 4.4. Restart Prometheus and Verify
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624711861_20210626204905946_20285.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624711862_20210626204930815_1142.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624711863_20210626205049566_10441.png)

## 5. References
- [Getting started | Prometheus](https://prometheus.io/docs/prometheus/latest/getting_started/)
- [First steps | Prometheus](https://prometheus.io/docs/introduction/first_steps/)
