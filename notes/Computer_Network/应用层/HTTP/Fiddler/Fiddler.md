## 1. 工作原理
Fiddler相当于一个中间人
![](https://raw.githubusercontent.com/TDoct/images/master/1593243999_20200627123646886_24723.png)

## 2. Fiddler界面
![](https://raw.githubusercontent.com/TDoct/images/master/1593244009_20200627124823112_16608.png)
### 2.1. 工具栏
![](https://raw.githubusercontent.com/TDoct/images/master/1593244017_20200627125547987_12529.png)

### 2.2. 状态栏
![](https://raw.githubusercontent.com/TDoct/images/master/1593244019_20200627132158242_31554.png)
### 2.3. 会话工具
- Statistics：性能分析
![](https://raw.githubusercontent.com/TDoct/images/master/1593244021_20200627132948873_18500.png)
- Inspectors：检查一个Http事务
![](https://raw.githubusercontent.com/TDoct/images/master/1593244024_20200627133051549_12946.png)

- AutoResponder：自定义响应信息
![](https://raw.githubusercontent.com/TDoct/images/master/1593244026_20200627134724036_16406.png)

- Filter：过滤器
![](https://raw.githubusercontent.com/TDoct/images/master/1593244030_20200627152205511_12523.png)
## 3. 常用操作

### 3.1. 设置HTTPS
- Tool-Options
![](https://raw.githubusercontent.com/TDoct/images/master/1593244003_20200627124111015_22053.png)
- HTTPS
![](https://raw.githubusercontent.com/TDoct/images/master/1593244007_20200627124658451_17867.png)
### 3.2. 设置代理
- Tool-Options
![](https://raw.githubusercontent.com/TDoct/images/master/1593244003_20200627124111015_22053.png)

- Connections
![](https://raw.githubusercontent.com/TDoct/images/master/1593244005_20200627124146991_17250.png)
- 浏览器
![](https://raw.githubusercontent.com/TDoct/images/master/1593244015_20200627125221039_5758.png)

### 3.3. 添加Server IP列

- Ctrl+R
- Ctrl+F，查找`static function Main()`
- 添加`FiddlerObject.UI.lvSessions.AddBoundColumn("ServerIP", 120, "X-HostIP");`
![](https://raw.githubusercontent.com/TDoct/images/master/1593244002_20200627124000496_13162.png)
- Ctrl+S
### 3.4. 开启过滤规则
- Rules
![](https://raw.githubusercontent.com/TDoct/images/master/1593244013_20200627125029489_26276.png)

### 3.5. 抓Android包
- 手机和PC在同一个局域网下
- 设置Fiddler允许远程连接
![](https://raw.githubusercontent.com/TDoct/images/master/1593244033_20200627152906084_22077.png)
- 手机设置`PCIP:8888`代理
- 手机访问`PCIP:8888`安装证书
## 4. 参考
- [Fiddler增加IP列；session高亮 \- 简书](https://www.jianshu.com/p/b1136e90de6c)
- [How to Display Host IP in Fiddler – legendctu @WEB](https://legendctu.github.io/memo/How-to-Display-Host-IP-in-Fiddler/)
- [Fiddler（四）设置代理 HTTPS 请求](http://www.testclass.net/proxy_tools/fiddler-04)
- [Fiddler抓包（Android app）\_hebbely的博客\-CSDN博客\_fiddler安卓版下载](https://blog.csdn.net/hebbely/article/details/79248077)