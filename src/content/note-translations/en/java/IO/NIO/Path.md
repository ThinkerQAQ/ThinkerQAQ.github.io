---
title: "java.nio.file.Path"
description: "Path composition, normalization, absolute/real paths, and filesystem-safe comparisons."
translationOf: "java/IO/NIO/Path"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

`Path` represents a filesystem path independently from legacy string-heavy `File` APIs. Use `resolve`, `relativize`, `normalize`, and `Files` operations rather than manual separator concatenation.

A normalized or absolute path is not necessarily the same as a **real** path after resolving symbolic links/filesystem state. Security checks involving containment must account for symlinks and TOCTOU races rather than comparing raw strings.

Do not assume case sensitivity or separator behavior is identical across filesystems.