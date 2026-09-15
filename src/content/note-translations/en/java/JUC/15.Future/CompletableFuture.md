---
title: "6.15 CompletableFuture"
description: "Composable asynchronous computation with CompletableFuture: stage chaining, error handling, executors, blocking hazards, and cancellation semantics."
translationOf: "java/JUC/15.Future/CompletableFuture"
language: "en"
updatedAt: "2026-09-15T04:40:00Z"
---

## 1. From `Future` to `CompletableFuture`

A plain `Future` mainly represents a result that may become available later. `CompletableFuture` adds a completion-stage model so dependent work can be composed instead of repeatedly blocking on `get()`.

Common entry points are:

```java
CompletableFuture.supplyAsync(() -> load());
CompletableFuture.runAsync(() -> refresh());
```

## 2. Chaining Stages

Important operations include:

- `thenApply`: transform a successful result;
- `thenCompose`: flatten a dependent asynchronous operation;
- `thenCombine`: combine independent results;
- `allOf` / `anyOf`: coordinate multiple futures;
- `exceptionally`, `handle`, `whenComplete`: observe or recover from failures.

Use `thenCompose` when a stage itself returns another `CompletionStage`; otherwise nested futures are easy to create accidentally.

## 3. Which Thread Runs a Stage?

Do not assume every stage creates a new thread.

Non-`Async` continuations may run in the thread that completes the previous stage. `*Async` methods without an explicit executor normally use the default asynchronous execution facility, commonly the `ForkJoinPool.commonPool()` for ordinary applications.

When workload isolation or blocking behavior matters, pass an explicit `Executor`.

## 4. Avoid Hidden Blocking

Calling `join()` or `get()` turns an asynchronous pipeline into a blocking boundary. Blocking common-pool workers on slow I/O can also reduce useful parallelism.

Prefer composition through the pipeline and block only at an intentional system boundary.

## 5. Failure and Cancellation

Exceptions propagate through dependent stages until handled. `join()` wraps exceptional completion in `CompletionException`; `get()` uses checked exceptions.

Cancellation of a `CompletableFuture` marks that stage as cancelled, but it should not be interpreted as guaranteed interruption or rollback of arbitrary underlying work. Design external side effects with their own cancellation/idempotency semantics.

## 6. Practical Rule

Use `CompletableFuture` for dependency graphs of asynchronous work. Use a deliberately chosen executor and explicit timeouts when the work depends on bounded external resources.