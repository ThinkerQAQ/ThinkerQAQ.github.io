---
title: "3.1 Grafana"
description: "Grafana installation and basic Prometheus data-source usage."
translationOf: "observability/grafana"
category: "observability"
categoryLabel: "Observability"
topic: "grafana"
topicLabel: "3.Grafana"
order: 4
tags: ["Grafana"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. Download Grafana
- [Download Grafana | Grafana Labs](https://grafana.com/grafana/download)
- Choose the appropriate standalone binary/package for the operating system.

## 2. Extract and Start Grafana
For a standalone archive, follow the directory layout of the current release. A typical command is:

```bash
./bin/grafana server
```

## 3. Open in the Browser
- http://localhost:3000/
- The first login normally uses the `admin` user; follow the current Grafana prompt for the initial password/change flow.

## 4. Add a Prometheus Data Source
### 4.1. Configure the Prometheus Data Source
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712617_20210626205616641_24164.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712618_20210626205733805_30756.png)

### 4.2. Import a Prometheus Dashboard/Data Source Configuration
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712618_20210626205807992_15408.png)

### 4.3. View the Prometheus Data Source
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712619_20210626205938871_10324.png)

### 4.4. Edit a Panel
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712619_20210626210204057_13950.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712620_20210626210231969_25065.png)
  - The panel query is ultimately a query against the Prometheus data source.

## 5. References
- [Grafana documentation](https://grafana.com/docs/grafana/latest/)
