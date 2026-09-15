---
title: "Cloneable and Object.clone"
description: "Java's Cloneable marker interface, shallow copying, constructor bypass, and why explicit copy APIs are usually clearer."
translationOf: "java/JDK/Cloneable/Cloneable"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`Cloneable` is a marker interface used by `Object.clone()`. If an object does not implement it, the inherited cloning mechanism normally throws `CloneNotSupportedException`.

The default mechanism performs a **shallow field copy**: primitive values are copied, while referenced objects are still shared. It also bypasses ordinary constructor-based object creation, which can make invariants and inheritance behavior hard to reason about.

For most application code, prefer an explicit copy constructor, factory method, record/value transformation, or domain-specific `copy` method. Use cloning only when compatibility with an existing API requires it.