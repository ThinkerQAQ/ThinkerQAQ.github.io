---
title: "6.22 Unsafe"
description: "Why sun.misc.Unsafe exists, what low-level operations it exposes, and why supported Java APIs should usually be preferred."
translationOf: "java/JUC/Unsafe/Unsafe"
language: "en"
updatedAt: "2026-09-15T04:40:00Z"
---

## 1. What `Unsafe` Is

`sun.misc.Unsafe` exposes low-level operations that bypass normal Java language safety boundaries. Historically the JDK and many libraries used it for atomic field updates, memory fences, raw/off-heap memory, object-field offsets, and other VM-level mechanisms.

The name is appropriate: misuse can violate type safety, corrupt memory, crash the JVM, or create bugs that the garbage collector cannot protect you from.

## 2. Internal API, Not an Ordinary Application API

`Unsafe` is not intended as a stable general-purpose application interface. Old examples often obtain its singleton through reflection, but such code depends on encapsulation details and may be restricted by the module system/runtime configuration.

Do not build normal application code around reflective access to `theUnsafe`.

## 3. Historical Uses

Typical operations include:

- obtaining field offsets;
- compare-and-set / get-and-add operations;
- ordered/volatile memory access and fences;
- allocating and freeing native memory;
- some class/object construction internals.

Exact method names and implementation availability are JDK-version-sensitive.

## 4. Prefer Supported APIs

Use supported abstractions when possible:

- `VarHandle` for low-level field/array access and memory-ordering modes;
- `java.util.concurrent.atomic` for common atomic variables;
- locks and concurrent collections for synchronization;
- modern foreign-memory APIs where direct/native memory access is genuinely required.

These APIs express intent more clearly and avoid tying code to JDK internals.

## 5. Memory Management Caveat

Java's garbage collector manages reachable Java heap objects, but it does not make every resource automatically safe. Native memory allocated outside the managed heap still needs a correct lifetime strategy, and Java applications can still leak memory by retaining references indefinitely.