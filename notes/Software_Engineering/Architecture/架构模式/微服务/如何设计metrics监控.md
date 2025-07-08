## 1. metrics监控是什么
记录事件发生的时间和数值，用来查看趋势

## 2. 为什么需要metrics监控

可以用来查看趋势，在出问题之前告警
## 3. 如何实现metrics监控
### 3.1. 监控什么数据

- 系统层：
    - 系统层主要是指宿主机和容器的监控，
    - 指标：CPU、磁盘、内存、网络等
- 中间层：
    - 中间层主要是指中间件和存储的监控，比如Nginx、Redis、ActiveMQ、Kafka、MySQL、Tomcat等
- 应用层：
    - 应用层指的是服务角度的监控，比如服务所有实例、某个具体实例、接口等监控
    - 指标：
        - 响应时间：主要是响应一个请求所消耗的延迟，比如某接口的HTTP请求平均响应时间为100ms。
        - 请求量：是指系统的容量吞吐能力，例如每秒处理多少次请求（QPS）作为指标。
        - 错误率：主要是用来监控错误发生的比例，比如将某接口一段时间内调用时失败的比例作为指标。
- 用户层：
    - 用户层主要是与用户、与业务相关的一些监控，属于功能层面的



### 3.2. 如何收集数据
#### 3.2.1. metrics数据类型有哪些
- 一般有Gauges（度量）、Counters（计数器）、 Histograms（直方图）、 Meters（TPS计算器）、Timers（计时器）这几种度量类型
#### 3.2.2. 如何上报给服务端
- Push：目标服务主动推送数据给metrics系统
    - 比如RPC框架支持Filter，写一个被调+主调的Filter，从RPC响应的Header里面取出数据即可
比如Naver的Pinpoint、SkyWalking
- Pull：metrics系统主动从目标服务拉取数据
### 3.3. 数据存储在哪
- [时序数据库.md](../../../../Monitor/TSDB/时序数据库.md)
- ![metrics监控](https://raw.githubusercontent.com/TDoct/images/master/1624792890_20210627191251803_11105.png =500x)
### 3.4. 如何监控预警
- 界面分析：
- 监控预警：存储metrics数据时顺带判断是否触发告警规则
- ![metrics监控-第 2 页](https://raw.githubusercontent.com/TDoct/images/master/1624792891_20210627191519047_6958.png =500x)
## 4. metrics监控组件
### 4.1. Prometheus
- [prometheus.md](../../../../Monitor/prometheus/prometheus.md)
### 4.2. InfluxDB

### 4.3. Open Metrics
- 从Prometheus分离出来的metrics API标准

### 4.4. Open Falcon
[Open\-Falcon · GitHub](https://github.com/open-falcon)
## 5. 参考
- [微服务架构之「 监控系统 」 \- 不止思考 \- 博客园](https://www.cnblogs.com/jsjwk/p/10899175.html)
- [十分钟看懂时序数据库 \- 存储](https://juejin.cn/post/6844903477856960526#comment)