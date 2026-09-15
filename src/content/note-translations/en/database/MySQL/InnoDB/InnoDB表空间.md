---
title: "InnoDB Tablespaces"
description: "Logical and physical storage of InnoDB pages across system, file-per-table, undo, and temporary tablespaces."
translationOf: "database/MySQL/InnoDB/InnoDB表空间"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

InnoDB stores data in **tablespaces**, which contain fixed-size pages used for indexes and other engine structures. Depending on configuration and object type, storage may reside in the system tablespace, file-per-table tablespaces, general tablespaces, undo tablespaces, or temporary storage.

A tablespace is not equivalent to one SQL table in every configuration. Operational work such as backups, space reclamation, and file growth should be reasoned about from the actual tablespace layout and MySQL version/configuration.