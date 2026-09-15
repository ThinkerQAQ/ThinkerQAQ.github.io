---
title: "Garbage Collection Tuning"
description: "A measurement-first GC tuning workflow based on allocation rate, live set, pause SLOs, memory headroom, and collector behavior."
translationOf: "garbage-collection/GC调优"
language: "en"
updatedAt: "2026-09-15T06:15:00Z"
---

Tune GC only after defining a target such as tail-pause latency, throughput, or memory footprint.

Measure allocation rate, retained/live set, pause percentiles, collection frequency, concurrent GC CPU, promotion/evacuation behavior, and process/container memory headroom. Excessive collection can come from application allocation patterns or retention, not merely “wrong GC parameters”.

Prefer reducing unnecessary allocation/retention and using sensible memory limits before adjusting low-level collector knobs. Collector options and defaults are runtime/version-specific, so validate every change under representative load.