---
title: "Spring Transaction Source Architecture"
description: "Proxy/interceptor transaction flow from metadata lookup to transaction manager begin/commit/rollback."
translationOf: "java/Framework/Spring/Spring事务/Spring事务源码分析"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

Declarative Spring transactions are commonly implemented through AOP proxies/interceptors.

At method entry, the transaction interceptor resolves transaction attributes, selects the configured `PlatformTransactionManager`, obtains/starts or joins a transaction according to propagation, invokes the target, then commits or rolls back according to completion/rollback rules.

Because proxy interception is involved, ordinary self-invocation can bypass transactional advice. Transaction semantics also depend on the underlying resource manager; Spring cannot make arbitrary non-transactional external side effects atomic with a database transaction.