---
title: "java.lang.Object"
description: "Core Object methods: equals/hashCode, toString, class identity, monitor methods, and cloning/finalization caveats."
translationOf: "java/JDK/Object/Object"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

Every ordinary Java reference type ultimately participates in the `Object` contract.

Important methods include `equals`, `hashCode`, `toString`, `getClass`, and monitor operations `wait/notify/notifyAll`. If `equals` is overridden, equal objects must produce equal hash codes.

`wait/notify` require owning the object's monitor and should be used with condition loops. `clone` is a legacy protected mechanism with shallow-copy semantics. Finalization is obsolete/deprecated for reliable resource management; prefer explicit cleanup.