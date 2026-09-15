---
title: "1.2 Time-Series Databases"
description: "TSDB fundamentals: time-range queries, dimensions and labels, cardinality, storage, and scaling."
translationOf: "observability/tsdb"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. What Is Time-Series Data?

Time-series data is a sequence of data points associated with timestamps, such as CPU usage, API QPS, temperature, or device state.

Typical queries select a time range and then perform aggregation, grouping, downsampling, or rate calculations.

## 2. What Is a Time-Series Database?

A time-series database (TSDB) is a database or storage engine optimized for workloads such as continuous time-series writes, time-range queries, aggregation, compression, and retention policies.

Relational databases can also store historical data, so it is inaccurate to say that they only store the current value. The main value of a TSDB is a data model and storage/query path optimized specifically for time-series workloads.

## 3. Data Models

There is no single universal TSDB data model. A product-specific `metric / field / tag` model should not be treated as a standard shared by all systems.

In Prometheus, a sample can be thought of as:

```text
metric name + label set + timestamp + value
```

For example:

```text
http_requests_total{service="api",method="GET"} 1024
```

The metric name identifies the measurement, labels provide dimensions, and the timestamp/value form the sample.

Other TSDBs, including InfluxDB-style systems, may distinguish fields from tags. Always follow the data model of the specific product.

## 4. Why TSDBs Fit Monitoring Data

Monitoring workloads commonly have these characteristics:

- continuous append-oriented writes
- queries over recent time windows
- windowed aggregation, rates, and percentile analysis
- large historical volumes that benefit from compression, retention, and downsampling

TSDBs are optimized for these access patterns.

## 5. High Cardinality

Label combinations determine the number of time series. Putting nearly unbounded values such as `user_id` or request IDs into labels can create huge numbers of series and significantly increase memory, disk, and query cost.

Metric labels should therefore be designed with cardinality in mind.

## 6. Storage and Scaling

TSDB implementations vary and should not all be reduced to an LSM-tree design. Implementations may combine WALs, compressed time blocks, indexes, and specialized encodings.

A single-node TSDB is perfectly reasonable for small workloads. Sharding, replication, or distributed storage becomes necessary only when data volume, retention, availability, or query pressure outgrows one node.

## 7. References

- [Prometheus storage](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
