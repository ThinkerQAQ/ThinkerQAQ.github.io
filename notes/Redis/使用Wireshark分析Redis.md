1. 选择localhost接口
![](https://raw.githubusercontent.com/TDoct/images/master/1598181002_20200626232736728_4039.png)
2. 选择筛选6379端口
![](https://raw.githubusercontent.com/TDoct/images/master/1598181009_20200626232815891_7658.png)
3. redis-cli发起命令
```cmd
incr zsk
```
4. 追踪流
![](https://raw.githubusercontent.com/TDoct/images/master/1598181010_20200626232930273_13158.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1598181012_20200626233006170_17908.png)
5. 分析包

```
.*2 #redis的命令都是以数组形式发送的，这里表示命令中由两个参数
$4 #第一个参数是长度为4的字符串
incr #第一个参数内容
$3 #第二个参数是长度为3的字符串
zsk #第二个参数内容
:2 #redis-server的返回值：2

```