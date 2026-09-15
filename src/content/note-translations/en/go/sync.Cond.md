---
title: "sync.Cond"
description: "Condition variables for waiting on state predicates under a lock."
translationOf: "go/sync.Cond"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

`sync.Cond` lets goroutines wait until shared state protected by a locker may have changed. `Wait` atomically unlocks the associated locker while waiting and reacquires it before returning.

Always check the state predicate in a loop because a wake-up only means “recheck the condition,” not that a particular invariant is now true. `Signal` wakes one waiter and `Broadcast` wakes all. Channels are often simpler when the problem is message/event delivery rather than condition-based shared state.