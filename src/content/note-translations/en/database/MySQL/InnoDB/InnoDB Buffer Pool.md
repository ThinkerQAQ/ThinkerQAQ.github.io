---
title: "1.29 InnoDB Buffer Pool"
description: "How InnoDB caches data and index pages, tracks free/dirty/cached pages, evicts cold pages, and decouples logical writes from data-file flushing."
translationOf: "database/MySQL/InnoDB/InnoDB Buffer Pool"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. What Is the Buffer Pool?

The InnoDB buffer pool is its main memory cache for table and index pages. It exists because memory access is far cheaper than repeatedly reading storage pages from disk.

## 2. Read Path

1. locate the page in the buffer-pool page table/hash structure;
2. if cached, read it from memory;
3. otherwise load it from storage into a buffer frame;
4. keep it available for future accesses until eviction.

## 3. Write Path

A change normally updates a page in memory and generates redo. The modified in-memory page becomes **dirty** and is flushed to the data file later. Durability at commit therefore does not require every changed data page to be written immediately.

## 4. Internal Bookkeeping

The original note highlights several useful structures:

- **free list**: frames available for new pages;
- **page lookup/hash**: determines whether a tablespace/page is already cached;
- **replacement/LRU structures**: choose cold pages for eviction when space is needed;
- **flush/dirty-page structures**: track pages that must eventually be written back.

InnoDB's actual replacement policy is more sophisticated than a textbook single LRU list because it tries to prevent one large scan from evicting the entire working set.

## 5. Sizing

`innodb_buffer_pool_size` is a major memory/performance setting on database servers. Size it as part of the whole machine memory budget rather than simply “as large as possible.”