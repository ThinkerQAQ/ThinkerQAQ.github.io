---
title: "PostgreSQL MVCC"
description: "Tuple versions, transaction visibility, snapshots, dead tuples, and vacuum."
translationOf: "database/PostgreSQL/PostgreSQL MVCC"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

PostgreSQL MVCC keeps multiple tuple versions and determines visibility from transaction metadata and the reader's snapshot. Updates normally create a new tuple version rather than modifying the visible row version in place.

Obsolete versions cannot be discarded until no relevant snapshot needs them, so vacuum is fundamental to reclaiming space and preventing transaction-ID related problems. Long-running transactions can therefore delay cleanup and increase table/index bloat.