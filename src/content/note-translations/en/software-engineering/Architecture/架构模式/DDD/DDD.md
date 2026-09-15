---
title: "Domain-Driven Design"
description: "DDD concepts: bounded contexts, ubiquitous language, aggregates, entities, value objects, domain services, and context integration."
translationOf: "software-engineering/Architecture/架构模式/DDD/DDD"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

Domain-Driven Design focuses software structure around a complex business domain and a shared **ubiquitous language** between domain experts and developers.

Strategic design identifies bounded contexts and their relationships. Tactical patterns include entities, value objects, aggregates, repositories, domain services, and domain events.

An aggregate is a consistency boundary, not simply every database table joined into one object graph. DDD is valuable when domain complexity justifies the modeling cost; CRUD-oriented domains may not need the full pattern vocabulary.