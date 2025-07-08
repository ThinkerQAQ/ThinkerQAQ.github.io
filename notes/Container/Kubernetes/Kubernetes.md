## 1. Kubernetes历史
Docker公司推出了Docker Swarm，开启PaaS战略，优势在于与Docker生态的无缝整合
Mesos公司推出了Marathon，优势在于大规模集群的调度与管理
Google基于内部的Borg 和 Omega 系统，推出了Kubernetes，优势在于设计理念先进
Google和RedHat成立了CNCF，以 Kubernetes 项目为基础，建立一个由开源基础设施领域厂商主导的、按照独立基金会方式运营的平台级社区，来对抗以 Docker 公司为核心的容器商业生态
## 2. 什么是Kubernetes
Kubernetes是容器编排工具，用于容器应用的自动部署、扩缩容以及管理
## 3. 为什么需要Kubernetes
### 3.1. 为什么需要容器编排
所谓容器编排，按照用户的意愿和整个系统的规则，完全自动化地处理好容器之间的各种关系

### 3.2. 为什么需要Kubernetes
Docker Swarm+Docker Compose项目可以做到调度单容器+处理简单的依赖关系，但是对于复杂的依赖关系就不行了，所以才需要Kubernetes

## 4. 如何使用Kubernetes
[Tutorials \| Kubernetes](https://kubernetes.io/docs/tutorials/)


## 5. kubeadm
### 5.1. kubeadm是什么
Kubernetes一键部署工具
### 5.2. 为什么需要kubeadm
Kubernetes的每个组件都是一个可执行文件，集群模式下需要传到每台服务器上进行部署，这个操作很麻烦，一般配合SaltStack、Ansible使用
为了支持一键部署Kubernetes，出来了kubeadm
### 5.3. 如何使用kubeadm
1. 安装 kubeadm、kubelet 和 kubectl 这三个二进制文件
```bash
apt-get install kubeadm
```
2. 部署 Master 节点
```bash
kubeadm init
```
3. 将一个 Node 节点加入到当前集群中
```bash
kubeadm join <Master 节点的 IP 和端口 >
```
### 5.4. kubeadm的问题
无法一键部署高可用的Kubernetes集群

### 5.5. kubeadm原理
#### 5.5.1. apt-get install kubeadm
把 kubelet 直接运行在宿主机上，然后使用容器部署其他的 Kubernetes 组件。
#### 5.5.2. kubeadm init
1. 环境检查
2. 生成证书
```conf
/etc/kubernetes/pki/ca.{crt,key}
```
3. 生成kube-apiserver 所需的配置文件，位于/etc/kubernetes/
```bash
admin.conf controller-manager.conf kubelet.conf scheduler.conf
```
4. 为 Master 组件生成 Pod 配置文件并容器化启动这些组件，配置文件位于/etc/kubernetes/manifests
5. 为 Etcd 生成Pod配置文件并容器化启动，配置文件位于/etc/kubernetes/manifests/
6. 通过 localhost:6443/healthz 检查Master组件的健康
7. 为集群生成一个bootstrap token，用于后续的kubeadm join
8. 把 ca.crt 等 Master 节点的重要信息，通过 ConfigMap 的方式
保存在 Etcd 当中，供后续部署 Node 节点使用
9. 安装默认插件：kube-proxy 和 DNS
#### 5.5.3. kubeadm join
就是和 kube-apiserver打交道把某台机器加入集群

## 6. Kubernetes架构

![](https://raw.githubusercontent.com/TDoct/images/master/1632664220_20210926163029694_1870.png =500x)
### 6.1. Etcd
存储整个集群的持久化数据
### 6.2. Master
Cluster中的Node，它的主要职责是调度，即决定将应用放在哪里运行
这个角色也是Borg项目对Kubernetes最大的指导意义
控制节点由三个组件组成：
- kube-apiserver：负责 API 服务
- kube-scheduler：负责调度
- kube-controller-manager：负责容器编排
### 6.3. Node
Cluster中的Node，它的职责是运行Pod
计算节点的入口是kubelet组件
- kubelet
    - 作用一：和容器运行时打交道
        - 通过CRI和Container Runtime打交道
            - Container Runtime：通过OCI和Linux操作系统打交道
        - 通过gRPC和Device Plugin打交道    
            - Device Plugin：管理 GPU 等宿主机物理设备的主要组件
    - 作用二：和容器配置网络打交道
        - 通过CNI和Networking打交道
    - 做用三：和容器持久化存储打交道
        - 通过CSI和Volume Plugin打交道
### 6.4. 容器间关系
![](https://raw.githubusercontent.com/TDoct/images/master/1632664221_20210926163057908_6947.png =500x)
为了解决容器间访问的问题，有了Pod
为了解决一次启动多个应用实例，有了Deployment
为了解决使用固定IP地址和端口访问多个实例，有了Service
为了解决容器间授权的问题，有了Secret
为了支持一次性任务、定时任务、守护进程服务，有了Job、CronJob、DaemonSet

#### 6.4.1. Pod

Kubernetes的最小工作单元。每个Pod包含一个或多个容器。Pod中的容器会作为一个整体被Master调度到一个Node上运行
有两种使用方式
- 运行单一容器
- 运行多个容器
#### 6.4.2. Controller
定义了Pod的部署特性，比如有几个副本、在什么样的Node上运行等
Deployment、ReplicaSet、DaemonSet、StatefuleSet、Job
#### 6.4.3. Service
Kubernetes Service定义了外界访问一组特定Pod的方式。Service有自己的IP和端口，Service为Pod提供了负载均衡
#### 6.4.4. Namespace
Namespace可以将一个物理的Cluster逻辑上划分成多个虚拟Cluster，不同Namespace里的资源是完全隔离的
## 7. Kubernetes原理

## 8. 参考
- [Kubernetes \- Wikipedia](https://en.wikipedia.org/wiki/Kubernetes)
- [Kubernetes \- 维基百科，自由的百科全书](https://zh.wikipedia.org/wiki/Kubernetes)
- [Tutorials \| Kubernetes](https://kubernetes.io/docs/tutorials/)
