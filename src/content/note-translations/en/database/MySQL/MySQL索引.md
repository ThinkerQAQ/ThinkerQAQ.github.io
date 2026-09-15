---
title: "1.8 MySQL Indexes"
description: "InnoDB primary and secondary B+ tree indexes, composite indexes, covering indexes, leftmost prefixes, selectivity, range scans, and index-design trade-offs."
translationOf: "database/MySQL/MySQL索引"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. What Is an Index?

An index is an auxiliary data structure that lets MySQL locate rows without scanning every record. InnoDB's common indexes are B+ trees organized into pages.

## 2. InnoDB Index Types

### 2.1 Clustered Primary-Key Index

InnoDB stores the full row in the leaf pages of the clustered index. A table therefore has one clustered organization; the primary key is used when available.

### 2.2 Secondary Index

A secondary-index leaf stores the secondary key plus the clustered primary key. If the query needs columns not present in the secondary index, InnoDB uses that primary key to look up the full row—commonly called a **back-to-table lookup**.

### 2.3 Unique Index

A unique index enforces uniqueness. Its optimization behavior differs from an ordinary index because uniqueness checks are part of writes.

### 2.4 Composite Index

For an index `(a, b, c)`, entries are ordered first by `a`, then `b` among equal `a`, then `c`. This creates the **leftmost-prefix** property.

## 3. How Queries Use an Index

Useful patterns include:

- equality predicates on a leftmost prefix;
- range scans over an ordered prefix;
- prefix matching such as `LIKE 'abc%'`;
- satisfying `ORDER BY` from index order when direction/order are compatible;
- **covering indexes**, where all required columns are available from the index itself;
- index condition pushdown, which evaluates additional indexed-column predicates before fetching the base row.

A range on one key part can limit how later key parts contribute to interval navigation, although later columns may still participate in filtering through techniques such as index condition pushdown. The simple rule “everything after the first range is unusable” is therefore too absolute.

## 4. Choosing Indexes

Prefer indexes that serve real access patterns:

- high-value `WHERE` / join predicates;
- frequent ordered or grouped access;
- good selectivity where selectivity materially reduces rows;
- compact key types when practical;
- composite column order based on equality, range, ordering, and query frequency—not a mechanical “highest cardinality first” rule.

## 5. Costs

Every additional index consumes storage and must be maintained by inserts, deletes, and updates. Indexes improve selected reads by spending write work and memory/storage capacity.

Always validate assumptions with [EXPLAIN](/en/notes/database/MySQL/MySQL%20explain/) and real workload measurements.