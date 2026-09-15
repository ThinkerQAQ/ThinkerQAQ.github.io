---
title: "StringBuffer"
description: "Legacy synchronized mutable text builder and its relationship to StringBuilder."
translationOf: "java/JDK/String/StringBuffer"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`StringBuffer` is a mutable character-sequence builder whose operations are synchronized.

It exists largely for legacy/thread-safe builder use cases. Synchronizing individual method calls does not automatically make a larger multi-step text-building protocol logically atomic.

For ordinary single-threaded/local construction, prefer `StringBuilder`.