---
title: "1.2 GCC"
description: "Install GCC on Windows/MSYS2 and record common GDB debugging commands."
translationOf: "developer-tools/gcc"
language: "en"
updatedAt: "2026-09-15T11:40:00Z"
---
## 1. Installation
### 1.1. Install MSYS2
[msys2.md](/en/notes/developer-tools/msys2/)

### 1.2. Install GCC

For the current MSYS2 UCRT64 environment, install the matching toolchain:

```sh
pacman -Syu
pacman -S --needed mingw-w64-ucrt-x86_64-toolchain mingw-w64-ucrt-x86_64-gdb
```

The old `pacman -S base-devel gcc gdb` command targets the MSYS environment itself. For native Windows programs, use the toolchain packages for the selected environment.

## 2. GDB

### 2.1. Running
- `run` / `r`: run the program and stop at breakpoints.
- `continue` / `c`: continue until the next breakpoint or program exit.
- `next` / `n`: step without normally entering a called function.
- `step` / `s`: step into a debuggable called function.
- `until`: continue to a later source location; commonly useful for getting past loops. Exact behavior depends on the current location and arguments.
- `until LINE`: run to a specified source location.
- `finish`: run until the current function returns.
- `call function(args)`: call a visible function in the debugging context.
- `quit` / `q`: exit GDB.

### 2.2. Breakpoints
- `break n` / `b n`: break at line n.
- `break file.cpp:578`: break at a file and line.
- `break fn1 if a > b`: conditional breakpoint.
- `break func`: break at a function entry.
- `delete n`, `disable n`, `enable n`: manage a breakpoint.
- `clear n`: clear a source-line breakpoint.
- `info breakpoints` / `info b`: list breakpoints.
- `delete breakpoints`: remove all breakpoints.

### 2.3. Viewing Source
- `list` / `l`: list source.
- `list LINE`: show source around a line.
- `list FUNCTION`: show source around a function.
- Repeating `list` continues with later source lines.

### 2.4. Printing Expressions
- `print EXPR` / `p EXPR`: evaluate and print an expression.
- `print ++a`: evaluate and print while also changing program state.
- `display EXPR`: display an expression whenever execution stops.
- `watch EXPR`: set a watchpoint; availability depends on the platform.
- `whatis`: query a type.
- `info functions`: list functions.
- `info locals`: show locals.

### 2.5. Runtime Information
- `where` / `bt` / `backtrace`: show the call stack.
- `up` / `down`: move between stack frames.
- `set args`: set program arguments.
- `show args`: show arguments.
- `info program`: show execution state and stop reason.

## 3. References
- [MSYS2](https://www.msys2.org/)
- [GDB Documentation](https://sourceware.org/gdb/documentation/)
- [GCC Online Documentation](https://gcc.gnu.org/onlinedocs/)
