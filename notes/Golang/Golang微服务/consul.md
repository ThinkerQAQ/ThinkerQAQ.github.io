## 1. 是什么

服务注册与发现的组件

## 2. 单机集群搭建
### 2.1. 下载
- [Download Consul \- Consul by HashiCorp](https://www.consul.io/downloads.html)
### 2.2. 配置文件

#### 2.2.1. 创建目录

```
mkdir -p conf/{node1,node2,node3}
mkdir -p data/{node1,node2,node3}
```


#### 2.2.2. 配置文件
- server1

```json
{
  "datacenter": "dc1",
  "data_dir": "C:\\software\\consul_1.7.2\\data\\node1",
  "log_level": "INFO",
  "server": true,
  "node_name": "node1",
  "ui": true,
  "bind_addr": "127.0.0.1",
  "client_addr": "127.0.0.1",
  "advertise_addr": "127.0.0.1",
  "bootstrap_expect": 3,
  "ports":{
    "http": 8500,
    "dns": 8600,
    "server": 8300,
    "serf_lan": 8301,
    "serf_wan": 8302
    }
}

```

- server2

```json
{
  "datacenter": "dc1",
  "data_dir": "C:\\software\\consul_1.7.2\\data\\node2",
  "log_level": "INFO",
  "server": true,
  "node_name": "node2",
  "bind_addr": "127.0.0.1",
  "client_addr": "127.0.0.1",
  "advertise_addr": "127.0.0.1",
  "bootstrap_expect": 3,
  "ports":{
    "http": 8510,
    "dns": 8610,
    "server": 8310,
    "serf_lan": 8311,
    "serf_wan": 8312
    }
}

```


- server3

```json
{
  "datacenter": "dc1",
  "data_dir": "C:\\software\\consul_1.7.2\\data\\node3",
  "log_level": "INFO",
  "server": true,
  "node_name": "node3",
  "bind_addr": "127.0.0.1",
  "client_addr": "127.0.0.1",
  "advertise_addr": "127.0.0.1",
  "bootstrap_expect": 3,
  "ports":{
    "http": 8520,
    "dns": 8620,
    "server": 8320,
    "serf_lan": 8321,
    "serf_wan": 8322
    }
}

```


### 2.3. 启动

- server1
```bat
consul agent  -config-dir C:\\software\\consul_1.7.2\conf\\node1
```

- server2
```bat
consul agent  -config-dir C:\\software\\consul_1.7.2\conf\\node2 -retry-join=127.0.0.1:8301
```

- server3
```bat
consul agent  -config-dir C:\\software\\consul_1.7.2\conf\\node3 -retry-join=127.0.0.1:8301
```

### 2.4. 测试

- 增加服务配置文件

```json
{
  "service": {                                      
	 "name": "web",									
	 "tags": ["master"],                            
	 "address": "127.0.0.1",						
	 "port": 10000,									
	 "checks": [
	   {
	     "http": "http://localhost:10000/health",
	     "interval": "10s"							
	   }
	 ]
  }
}
```

- 增加服务

```go
package main

import (
	"fmt"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("hello Web3! This is n3或者n2")
	fmt.Fprintf(w, "Hello Web3! This is n3或者n2")
}
func healthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("health check! n3或者n2")
}
func main() {
	http.HandleFunc("/", handler)
	http.HandleFunc("/health", healthHandler)
	http.ListenAndServe(":10000", nil)
}

```

- web ui


## 3. 参考

- [Consul集群搭建 \- 简书](https://www.jianshu.com/p/27265e34d911)
- [WEHousing/08Consul\.md at master · MineCoinChain/WEHousing](https://github.com/MineCoinChain/WEHousing/blob/master/Document/material/08Consul.md)