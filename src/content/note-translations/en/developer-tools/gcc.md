---
title: "3.1 GCC and Native Compilation Toolchains"
description: "Understand preprocessing, compilation, assembly, linking, object files, libraries, ABI boundaries, and debug builds through GCC."
translationOf: "developer-tools/gcc"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. The `gcc` Command Is More Than a Compiler

In everyday use, `gcc` behaves like a **compiler driver**. It coordinates the preprocessor, compiler, assembler, and linker according to the requested build.

A useful mental model is:

`source → preprocessed source → assembly → object file → executable/shared library`

Before fixing a build failure, identify which stage failed.

## 2. Common Stages

```sh
gcc -E main.c -o main.i
gcc -S main.c -o main.s
gcc -c main.c -o main.o
gcc main.o -o app
```

These mean:

- `-E`: preprocess only;
- `-S`: compile to assembly;
- `-c`: produce an object file without linking;
- final command: link the executable.

This model is more useful than memorizing only `gcc main.c -o app`.

## 3. Headers, Libraries, and Linking

Headers and libraries solve different problems.

- headers primarily provide declarations and compile-time interfaces;
- static libraries contribute code at link time;
- dynamic libraries must also be found and remain ABI-compatible at runtime.

Therefore, finding a header does not prove linking will succeed, and successful linking does not guarantee the deployed machine will find the correct DLL or shared library.

## 4. ABI Is Below Source-Level Syntax

Binary compatibility can depend on:

- CPU architecture;
- calling conventions;
- object-file format;
- C/C++ runtime;
- name mangling;
- data layout;
- compiler and linker options.

On Windows/MSYS2, object files and static libraries targeting different C runtimes should not be mixed casually. UCRT64 and legacy MINGW64/MSVCRT should be treated as different toolchain targets.

## 5. Debug Builds

To make source-level debugging practical, a simple build might use:

```sh
gcc -g -O0 main.c -o app
```

`-g` emits debug information, while `-O0` keeps the relationship between source and generated code easier to inspect.

However, some defects appear only in optimized builds. In those cases, keep debug information while using the production optimization level and account for inlining, reordered code, and optimized-out variables.

## 6. Warnings and Errors

Successful compilation does not mean the program is free of problems.

A common warning baseline is:

```sh
gcc -Wall -Wextra -Wpedantic ...
```

More warnings are not automatically better. The important part is choosing rules appropriate for the project and enforcing them consistently in CI.

## 7. GCC on Windows

When targeting modern 64-bit native Windows through MSYS2, use the GCC package that matches the active environment. For UCRT64, use its UCRT64 GCC package.

Old standalone MinGW installers and abandoned offline toolchains should not be the default recommendation for a new setup.

## 8. Reproducible Builds

Development, CI, and release environments should record at least:

- compiler version;
- target triple;
- build flags;
- dependency versions;
- runtime requirements.

Reproducibility depends on these details, not on the statement “it compiles with GCC on my machine.”