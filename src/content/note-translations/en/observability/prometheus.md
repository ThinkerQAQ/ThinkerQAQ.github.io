---
title: "2.1 Prometheus"
description: "Prometheus role, architecture, and core components."
translationOf: "observability/prometheus"
category: "observability"
categoryLabel: "Observability"
topic: "prometheus"
topicLabel: "2.Prometheus"
order: 2
tags: ["Prometheus"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is Prometheus
- A metrics monitoring system.

## 2. Prometheus Architecture
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624791918_20210627185603132_24427.png)
- **Prometheus Server**: primarily scrapes monitoring data over HTTP from exporters or instrumented targets and stores it in its local TSDB for querying and rule evaluation.
- **Exporters**: expose HTTP endpoints that Prometheus can scrape.
- **Pushgateway**: mainly intended for a limited set of cases such as short-lived, service-level batch jobs that cannot be scraped continuously. It is not a general-purpose proxy for every unreachable target.
- **Alertmanager**: after Prometheus evaluates alerting rules and emits alerts, Alertmanager handles grouping, inhibition, silences, and notifications such as email.

## 3. Prometheus Installation
See the Prometheus installation note.

## 4. References
- [Prometheus Overview](https://prometheus.io/docs/introduction/overview/)
