---
title: "2.6 Redis Key Design"
description: "Practical Redis key naming, schema modeling, indexing, cardinality, hashes vs. strings, TTL boundaries, cluster hash tags, and why key scans should not become a query engine."
translationOf: "redis-cache/使用/Redis key 设计技巧"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. Redis Is Not a Relational Query Engine

Do not mechanically mirror every SQL column into a separate Redis key and then depend on wildcard key scans for queries.

Redis works best when keys are designed around known access paths.

## 2. Naming

Use predictable namespaces:

```text
user:42
user:email:alice@example.com:id
post:123
feed:user:42
```

Keep names readable but not excessively verbose at very large key counts because key bytes themselves consume memory.

## 3. Build Explicit Secondary Indexes

If you need lookup by email, username, or another field, maintain an explicit mapping:

```text
user:email:<email> -> user_id
```

For many-to-many relationships, sets or sorted sets often model membership better than wildcard scanning.

## 4. Avoid `KEYS` in Request Paths

`KEYS pattern` scans the keyspace and can block large production instances. Use:

- explicit indexes;
- bounded collection keys;
- `SCAN` for operational/background iteration when necessary.

## 5. String vs. Hash

Use a hash when fields are independently read/updated and belong naturally to one lifecycle/TTL boundary.

Use a serialized string when the object is normally read/written as a whole or when application serialization is more compact/simple.

Do not create one enormous hash containing unrelated objects simply to save key overhead; that becomes a big-key problem.

## 6. Cluster Placement

Redis Cluster routes keys by hash slot. Use hash tags such as `{user:42}:profile` and `{user:42}:sessions` only when colocating related keys is necessary for atomic multi-key operations.

Overusing one hash tag can create a hot slot.

## 7. Lifecycle

Define for every key family:

- owner/source of truth;
- TTL or retention;
- maximum value/cardinality;
- rebuild strategy;
- consistency expectations.

That schema discipline matters more than the exact separator character in the key name.