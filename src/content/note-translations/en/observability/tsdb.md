---
title: "1.1 Time-Series Database"
description: "Time-series databases, time-series data, data models, and storage implementation."
translationOf: "observability/tsdb"
category: "observability"
categoryLabel: "Observability"
topic: "tsdb"
topicLabel: "1.TSDB"
order: 1
tags: ["TSDB"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is a Time-Series Database
A time-series database is a database optimized for timestamped or time-series data.

Time-series databases are optimized for continuous timestamped writes, compression, aggregation, and time-range queries. Relational databases can also store historical data; the difference is mainly the data model and the optimizations made for time-series workloads.

## 2. What Is Time-Series Data
Time-series data is a sequence of observations associated with time.

## 3. Why Use a Time-Series Database
### 3.1. Recording with a Relational Model
- If time-series data is stored in an ordinary table:
  - ![](https://raw.githubusercontent.com/TDoct/images/master/1621524706_20210520233139320_6919.png)
  - Common challenges at large scale include:
    - high write volume;
    - expensive time-based aggregation;
    - storage cost.

### 3.2. Time-Series Model
The exact terminology varies by product. In an InfluxDB-style model:

- metric: the metric name. It can be loosely compared with a table in a relational database.
- data point: one observation, loosely comparable with a row.
- timestamp: when the data point was produced.
- field: a value that commonly changes over time, such as wind direction or speed.
- tag: indexed metadata that commonly identifies a series, such as sensor or city.

In the example:
- the metric is `Wind`, and every data point has a timestamp;
- fields are `direction` and `speed`;
- tags are `sensor` and `city`.

## 4. Time-Series Database Implementation
### 4.1. LSM Tree
LSM trees are commonly used in write-heavy storage systems.

### 4.2. Distributed Storage
When time-series volume exceeds the capacity or throughput of one machine, data can be distributed across multiple nodes. Small deployments do not inherently require distributed storage.

#### 4.2.1. Distribution Algorithm
A distributed TSDB needs a partitioning strategy that determines where series are stored.

#### 4.2.2. Shard Key
A common idea is to partition by a combination such as metric + tags so that points from the same logical series can remain colocated for time-range access. Actual designs vary by database.

## 5. References
- [时间序列数据库(TSDB)初识与选择](https://segmentfault.com/a/1190000021678576)
- [十分钟看懂时序数据库](https://juejin.cn/post/6844903477856960526#comment)
