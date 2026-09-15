---
title: "3.2 GDB Debugging Fundamentals"
description: "A durable GDB model built around breakpoints, stepping, stack frames, variables, watchpoints, and threads."
translationOf: "developer-tools/gdb"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. A Mental Model for GDB

GDB's core capabilities can be grouped into five jobs:

1. decide when the program stops;
2. control how execution continues;
3. inspect the current state;
4. modify state for experiments;
5. inspect threads, stack frames, and memory.

Understanding commands by purpose is more durable than memorizing abbreviations.

## 2. Starting a Program

```sh
gdb ./app
(gdb) set args --config dev.yaml
(gdb) run
```

GDB can also attach to an existing process, but attaching to production processes can pause threads or change timing and must be done carefully.

## 3. Breakpoints

```gdb
break main
break file.c:42
break worker if count > 100
info breakpoints
disable 2
enable 2
delete 2
```

Conditional breakpoints are useful for narrowing a problem, but the condition may be evaluated repeatedly and can make hot code paths much slower.

## 4. Stepping

```gdb
next
step
continue
finish
until
```

- `next`: execute the next source line, normally stepping over calls;
- `step`: enter debuggable function calls;
- `continue`: run until the next stop condition;
- `finish`: run until the current frame returns;
- `until`: continue until execution reaches a later source location, often useful around loops but not a special “exit loop” command.

## 5. Variables and Expressions

```gdb
print value
p/x flags
display counter
info locals
info args
```

`print` can even invoke functions in the inferior process. That changes program state and should not be treated as a pure observation operation.

## 6. Watchpoints

```gdb
watch counter
rwatch ptr
awatch state
```

Watchpoints focus on data access or modification instead of a code location.

Hardware watchpoints are limited in number, and fallback implementations can be expensive, so performance impact matters.

## 7. Stack Frames

```gdb
backtrace
frame 3
up
down
info frame
```

For crashes, the call stack is often more informative than the current source line because the root cause may have occurred earlier in the call path.

For multithreaded programs:

```gdb
info threads
thread 4
thread apply all backtrace
```

## 8. Optimized Code Can Look Strange

With optimization enabled, GDB may show:

- variables as `<optimized out>`;
- source lines appearing to execute out of order;
- inlined functions;
- locals that no longer exist as distinct memory locations.

This does not necessarily mean GDB is broken. The compiler has transformed the machine code.

## 9. GDB and IDE Debuggers

Breakpoints, Variables, and Call Stack panels in an IDE are graphical interfaces over the same underlying debugging concepts.

Understanding GDB makes it easier to distinguish program, symbol, source-path, and IDE-adapter problems when the graphical debugger fails.