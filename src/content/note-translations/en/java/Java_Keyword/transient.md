---
title: "Java transient"
description: "The transient modifier in Java native serialization and why it is not a general secrecy/security mechanism."
translationOf: "java/Java_Keyword/transient"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

`transient` affects Java's native serialization mechanism: an ordinary transient instance field is omitted from the default serialized state.

It is **not** an access-control or encryption feature. A transient secret still exists in process memory and may be logged/copied elsewhere.

Custom serialization methods can also explicitly handle state, so `transient` should be understood as part of one serialization contract, not a universal “never persist this field” guarantee.