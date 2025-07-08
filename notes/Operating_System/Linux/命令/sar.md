## 1. 使用
每秒输出一次
```
sar -n DEV 1
```
## 2. 输出

![](https://raw.githubusercontent.com/TDoct/images/master/1649054326_20220404143603221_19588.png)

## 3. 解析
- IFACE：网卡接口
- rxpck/s：每秒接收的包数目
- txpck/s：每秒发送的包数目
- rxkB/s：每秒接收的数据量，单位KB
- txkB/s：每秒发送的数据量，单位KB