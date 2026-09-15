---
title: "Entity–Relationship Diagrams"
description: "Modeling entities, attributes, identifiers, and relationships for data-oriented system design."
translationOf: "software-engineering/建模/ER图"
language: "en"
updatedAt: "2026-09-15T07:00:00Z"
---

An ER diagram models persistent domain data through **entities**, their attributes, identifiers, and relationships. Cardinality such as one-to-one, one-to-many, and many-to-many describes how entity instances can be associated.

Use ER diagrams to reason about data ownership and schema structure before implementation. They are not a substitute for transaction, lifecycle, or service-boundary modeling: a relationship that exists in the database does not automatically imply that two concepts belong in one aggregate or service.