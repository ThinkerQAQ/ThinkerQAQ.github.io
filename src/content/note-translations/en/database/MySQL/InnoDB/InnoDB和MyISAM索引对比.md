---
title: "InnoDB vs. MyISAM Indexes"
description: "How InnoDB clustered indexes differ from MyISAM's separate data and index storage."
translationOf: "database/MySQL/InnoDB/InnoDB和MyISAM索引对比"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

InnoDB organizes table rows around a clustered B+tree, normally keyed by the primary key. Secondary-index leaf entries contain the indexed columns plus the primary-key value, so a secondary lookup may require another traversal of the clustered index.

MyISAM stores table data separately from B-tree indexes whose leaf entries identify row locations. This architectural difference affects lookup paths, update cost, row organization, and recovery semantics. In modern MySQL, InnoDB is the normal transactional engine; MyISAM is mainly relevant for legacy cases.