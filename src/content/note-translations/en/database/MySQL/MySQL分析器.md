---
title: "MySQL SQL Parsing"
description: "Lexing, parsing, semantic resolution, and the boundary between parsing and optimization."
translationOf: "database/MySQL/MySQL分析器"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

Before optimization/execution, MySQL parses SQL into an internal representation: tokens are recognized, syntax is validated, and referenced objects/expressions are resolved according to the server's processing pipeline.

Parsing answers whether the statement is structurally valid; it does not decide the cheapest access path. Cost-based plan selection belongs to optimization, while actual row access belongs to the executor/storage engine.