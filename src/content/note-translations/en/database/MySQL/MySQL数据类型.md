---
title: "MySQL Data Types"
description: "Choosing numeric, temporal, string, binary, JSON, and exact-value types from semantics and access patterns."
translationOf: "database/MySQL/MySQL数据类型"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

Choose a MySQL data type from the domain's semantics first: range and signedness for integers, `DECIMAL` for exact decimal values such as money when appropriate, temporal types for time semantics, and bounded character/binary types for textual or opaque data.

Type choice affects storage, comparison, indexing, collation, implicit conversions, and application compatibility. Avoid storing structured numeric/time values as strings merely for convenience.