---
title: "Vector"
description: "Legacy synchronized Vector behavior and why ArrayList or specialized concurrent collections are usually preferred."
translationOf: "java/JDK/List/Vector"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`Vector` is a legacy resizable-array collection whose public operations are synchronized.

Its synchronization makes individual operations mutually exclusive, but compound operations still require correct external coordination. The coarse locking also does not make it an ideal modern concurrent collection.

Use `ArrayList` when no shared concurrent mutation is needed; otherwise select a concurrent collection or explicit synchronization strategy appropriate to the workload.