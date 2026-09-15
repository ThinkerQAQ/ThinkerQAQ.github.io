---
title: "Ordering Spring Bean Initialization"
description: "How to express real bean dependencies instead of relying on incidental initialization order."
translationOf: "java/Framework/Spring/Bean/Spring中如何让A和B两个bean按顺序加载"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

If bean B truly requires bean A to exist first, model that dependency explicitly through constructor/setter injection or `@DependsOn` when there is an initialization dependency without a normal object reference.

Do not rely on component-scan order, source-file order, or bean-name ordering; those are not a robust application dependency model.

For startup tasks that need the whole context ready, use an appropriate lifecycle/application-runner/event hook rather than manufacturing artificial bean dependencies.