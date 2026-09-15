---
title: "MySQL Connections and Connectors"
description: "Client authentication, sessions, connection pools, limits, timeouts, and protocol lifecycle."
translationOf: "database/MySQL/MySQL连接器"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

Clients connect to MySQL through a connector/driver implementing the MySQL protocol. A server session carries authentication identity and session state such as transaction, isolation, charset, and variables.

Application connection pools should be bounded and sized from database capacity, not application thread count. Configure connection/acquire/query timeouts, validate broken connections, and avoid thousands of idle sessions that consume resources without adding throughput.