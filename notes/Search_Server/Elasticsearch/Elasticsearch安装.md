## 1. 单机版

### 1.1. 下载安装Elasticsearch
[Elasticsearch 7\.4\.2 \| Elastic](https://www.elastic.co/cn/downloads/past-releases/elasticsearch-7-4-2)
### 1.2. 下载安装Kibana
- [Kibana 7\.4\.2 \| Elastic](https://www.elastic.co/cn/downloads/past-releases/kibana-7-4-2)
### 1.3. Chrome管理插件
- [ElasticSearch Head \- Chrome 网上应用店](https://chrome.google.com/webstore/detail/elasticsearch-head/ffmkiejjmecolpfloofpjologoblkegm)
- [Elasticvue \- Chrome 网上应用店](https://chrome.google.com/webstore/detail/elasticvue/hkedbapjpblbodpgbajblpnlpenaebaa/related)
- [dejavu \- Chrome Web Store](https://chrome.google.com/webstore/detail/dejavu/lcanobbdndljimodckphgdmllahfcadd?hl=en)


## 2. 集群版
### 2.1. 下载Elasticsearch

[Elasticsearch 6\.8\.1 \| Elastic](https://www.elastic.co/cn/downloads/past-releases/elasticsearch-6-8-1)

### 2.2. 解压三个文件夹
![](https://raw.githubusercontent.com/TDoct/images/master/1585471356_20200327152349445_8366.png)

### 2.3. 创建data文件夹

```
mkdir -p elasticsearch1/data
mkdir -p elasticsearch2/data
mkdir -p elasticsearch3/data
```
### 2.4. 修改配置

- es*

```java
cluster.name: myes
node.name: es1

# 是否有资格成为主节点
node.master: true

# 是否是数据节点
node.data: true

# 数据和日志路径
path.data: /home/zsk/software/es/es6/elasticsearch1/data
path.logs: /home/zsk/software/es/es6/elasticsearch1/logs

# 设置访问的地址和端口
network.host: 0.0.0.0

# 配置访问的端口
http.port: 9200

# 集群地址设置
discovery.zen.ping.unicast.hosts: ["localhost:9200", "localhost:9201", "localhost:9202"]

# 为了防止集群发生“脑裂”，即一个集群分裂成多个，通常需要配置集群最少主节点数目，通常为 (可成为主节点的主机数目 / 2) + 1
discovery.zen.minimum_master_nodes: 2

```

### 2.5. 启动

- es*

```java
elasticsearch2/bin/elasticsearch
```

### 2.6. 测试

## 3. 参考
- [手把手教你搭建一个 Elasticsearch 集群 \- 掘金](https://juejin.im/post/5bad9520f265da0afe62ed95#heading-7)
