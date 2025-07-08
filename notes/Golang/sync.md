## 1. 是什么
提供了基本的`synchronization primitives`
除了`Once`和`WaitGroup`外，大部分都是给`low-level`的库使用的
`high-level`一般使用`channels`


## 2. 有什么

### 2.1. Locker
- 是个接口
- 有Lock和Unlock方法
### 2.2. Mutex
[sync.Mutex.md](sync.Mutex.md)
### 2.3. RWMutex
[sync.RWMutex.md](sync.RWMutex.md)

### 2.4. Cond
[sync.Cond.md](sync.Cond.md)


### 2.5. Once
[sync.Once.md](sync.Once.md)

### 2.6. Map
[sync.map.md](sync.map.md)

### 2.7. Pool
[sync.pool.md](sync.pool.md)
### 2.8. WaitGroup
[sync.WaitGroup.md](sync.WaitGroup.md)


### 2.9. atomic包


[atomic.md](atomic.md)
## 3. 参考
- [sync \- The Go Programming Language](https://golang.org/pkg/sync/#Locker)
- [atomic \- The Go Programming Language](https://golang.org/pkg/sync/atomic/)