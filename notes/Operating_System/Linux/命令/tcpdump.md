## 1. 使用
### 1.1. 获取网卡名
- tcpdump -D
- ifconfig

### 1.2. 抓包
- 简单使用
```go
tcpdump -i 网卡名
```

- 高级语法
    - 类型关键字：host port
    - 确认传输方向：src dst
    - 协议关键字：tcp、udp
    - 逻辑运算符：and or
### 1.3. 导出
```go
tcpdump -i 网卡名 -v -nn tcp port 端口号 -w test.cap
```

### 1.4. 使用wireshark或tcpdump分析
```
tcpdump -r test.cap
```

## 2. 参考
- [Microolap TCPDUMP for Windows — Download](https://www.microolap.com/products/network/tcpdump/download/)
- [WinDump\-\-Windows 的tcpdump工具](http://www.360doc.com/content/11/0319/10/54470_102500630.shtml)
- [WinDump \- Download](https://www.winpcap.org/windump/install/default.htm)