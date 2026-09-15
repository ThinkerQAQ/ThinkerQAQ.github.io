---
title: "Bitmap"
description: "Compact set membership and counting over dense integer domains using bits."
translationOf: "algorithm/数据结构/BitMap"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A bitmap represents membership of integer positions with bits: bit `i` records whether value/condition `i` is present.

It is extremely compact for dense bounded domains and supports fast set operations such as intersection/union through machine-word bit operations.

For sparse huge domains, a plain bitmap can waste space; compressed bitmaps or hash/set structures may be better. Map arbitrary values to bit positions only when the mapping/range is controlled.