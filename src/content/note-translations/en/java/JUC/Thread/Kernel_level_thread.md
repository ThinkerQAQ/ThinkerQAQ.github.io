---
title: "6.21 User, Kernel, and Java Threads"
description: "User-level versus kernel-level threads, the traditional Java platform-thread mapping, and how virtual threads change the model."
translationOf: "java/JUC/Thread/Kernel_level_thread"
language: "en"
updatedAt: "2026-09-15T04:40:00Z"
---

## 1. User-Level and Kernel-Level Threads

A kernel thread is scheduled by the operating-system kernel. A user-level threading runtime can multiplex logical threads onto a smaller number of kernel-scheduled threads.

Historically, mainstream HotSpot **platform threads** use an approximately one-Java-thread-to-one-native-thread model. Creating many platform threads therefore consumes native scheduling and stack resources.

## 2. Do Not Generalize This to Every Java Thread

Modern Java also provides **virtual threads**. A virtual thread is scheduled by the JVM and can be mounted on different carrier platform threads over time.

Therefore the statement “every Java thread is one kernel thread” is no longer a correct general description of Java concurrency.

## 3. What OS Thread Counts Show

Creating hundreds of platform threads will normally increase the process's native-thread count, which demonstrates the platform-thread/native-thread relationship. It does not prove that all possible JVM threading abstractions must use that mapping.

## 4. Practical Implication

Choose the concurrency model based on workload:

- platform threads expose scarce native-thread resources directly;
- virtual threads make large numbers of blocking tasks cheaper;
- neither model removes limits on DB connections, file descriptors, memory, or downstream service capacity.