---
title: "2.12 Channels"
description: "Go channels as typed communication and synchronization primitives: buffered vs. unbuffered behavior, closing, ownership, blocking semantics, and runtime implementation."
translationOf: "go/channel"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. Channels and CSP

Go's concurrency design is strongly influenced by Communicating Sequential Processes (CSP). Goroutines execute concurrent work; channels provide typed communication and synchronization between goroutines.

Go also supports shared-memory primitives such as mutexes and atomics. “Do not communicate by sharing memory; share memory by communicating” is a design guideline, not a rule that every shared variable must be replaced by a channel.

## 2. Creating Channels

```go
unbuffered := make(chan int)
buffered := make(chan int, 10)

var sendOnly chan<- int = buffered
var recvOnly <-chan int = buffered
```

### Unbuffered

A send and receive rendezvous: communication cannot complete until both sides participate.

### Buffered

A send can complete while buffer capacity remains; a receive can complete while buffered values remain. Once the buffer is full, further sends block until capacity is freed.

## 3. Sending and Receiving

```go
ch <- value
value := <-ch
value, ok := <-ch
```

Channels coordinate both data transfer and memory visibility according to the [Go memory model](/en/notes/go/concurrent/).

## 4. Closing

```go
close(ch)
```

Closing means **no more values will be sent**.

After buffered values are drained, receives continue immediately with the element type's zero value and `ok == false`.

Important rules:

- sending to a closed channel panics;
- closing an already closed channel panics;
- receiving from a closed channel is valid;
- a nil channel blocks forever on send and receive.

## 5. Who Should Close a Channel?

A useful ownership rule is: **the goroutine responsible for producing the stream should normally own the decision to close it**.

With multiple producers, coordinate shutdown instead of letting arbitrary producers race to close the data channel. A separate cancellation signal—often `context.Context` or a channel closed exactly once—can broadcast shutdown to many goroutines.

Closing a channel can wake multiple receivers, so a channel is not limited to “controlling one goroutine.”

## 6. Channel vs. Mutex

Use a channel when the design naturally expresses:

- transferring ownership of data;
- sending events or jobs;
- building pipelines;
- coordinating lifecycle or backpressure.

Use a mutex when several goroutines simply need synchronized access to shared state and message passing would make the design less clear.

## 7. Runtime Implementation

The runtime represents channels with a structure containing, conceptually:

- channel state and element metadata;
- a circular buffer for buffered channels;
- queues of waiting senders and receivers;
- synchronization protecting channel state.

The exact `runtime.hchan` layout is an implementation detail and changes over time. The public blocking, closing, and memory-ordering semantics are the stable contract.
