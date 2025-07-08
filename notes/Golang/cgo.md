## 1. Windows CGO

1. 安装msys2
[msys2.md](../Others/软件/msys2.md)
2. 安装GCC toolchain

```go
pacman -S --needed base-devel mingw-w64-i686-toolchain mingw-w64-x86_64-toolchain
```

3. 测试
```go
go get github.com/faiface/pixel
cd $(go env GOPATH)/src/github.com/faiface/pixel/examples/platformer
go get
go build
./platformer.exe
```

## 2. 参考
[Go development environment on Windows with MSYS2 · GitHub](https://gist.github.com/glycerine/355121fc4cc525b81d057d3882673531?utm_source=pocket_saves)

