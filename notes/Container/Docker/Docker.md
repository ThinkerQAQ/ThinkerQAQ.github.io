## 1. Docker历史
最开始我们需要在本地开发好应用后需要在服务器上部署，但是服务器环境和本地环境不一致，很容易出现兼容性问题
然后出现了传统的PaaS产品，他们提供了应用托管的能力，解决了服务器环境和本地环境不一致的问题，但是打包软件特别麻烦
最后Docker横空出世，通过镜像技术解决了打包软件的问题，CaaS时代开启
## 2. 什么是Docker
Docker是PaaS软件产品/工具，通过OS-level的虚拟化技术把软件打包进容器中
### 2.1. 虚拟机 vs Docker
![](https://raw.githubusercontent.com/TDoct/images/master/1630682050_20210903230919060_23011.png)
- 虚拟机：虚拟机进程真实存在，且必须运行一个GuestOS。
    - 性能：虚拟机本身需要200-300M内存，且用户程序的系统调用->GuestOS->虚拟机->HostOS导致性能损耗
    - 隔离性：有独立的GuestOS隔离性好，比如Windows HostOS可以运行Linux GuestOS
- Docker：没有虚拟机进程，Docker创建出来的容器进程就运行在HostOS上
    - 性能：用户程序的系统调用->HostOS，没有性能损耗
    - 隔离性：使用的是HostOS的内核，隔离性差，比如有些资源无法Namespace化，比如时间

|           |   虚拟机   |         Docker         |
| --------- | ---------- | ---------------------- |
| 虚拟化技术 | Hypervisor | Linux Namespace+cgroup |
| 性能       |       低     |            高            |
| 隔离性     | 高           |         低               |


## 3. 为什么需要Docker
对于开发人员：Build Once、Run Anywhere
对于运维人员：Configure Once、Run Anything
## 4. 如何使用Docker
### 4.1. Docker镜像
#### 4.1.1. 什么是Docker镜像
是一组文件，用来实例化容器并运行代码
#### 4.1.2. 如何使用Docker镜像
##### 4.1.2.1. 构建镜像
1. docker commit
    ```cmd
    # terminal1
    docker pull ubuntu
    docker run -it ubuntu
    apt-get update && apt-get install vim

    # terminal2
    docker ps
    docker commit tender_bassi ubuntu-with-vim
    docker history ubuntu-with-vim
    ```

2. Dockerfile
    ```Dockerfile
    FROM ubuntu
    RUN apt-get update && apt-get install -y vim
    ```
    ```cmd
   docker build -t ubuntu-with-vim-dockerfile .
    ```
- CMD vs RUN vs ENTRYPOINT
    - CMD：为容器设置默认的启动命令
    - RUN：安装应用和软件包
    - ENTRYPOINT：运行应用程序或服务
##### 4.1.2.2. 查看镜像构建历史
```
docker history 镜像
```

##### 4.1.2.3. 推送镜像
```
docker tag ubuntu-with-vim ubuntu-with-vim:v1.0
docker push ubuntu-with-vim:v1.0
```
### 4.2. Docker容器
#### 4.2.1. 什么是Docker容器
一个特殊的进程，有Docker镜像实例化
#### 4.2.2. 如何使用Docker容器
##### 4.2.2.1. 运行容器
```
docker run -it 镜像名
```
启动时可以限制cpu、memory、network、IO等
##### 4.2.2.2. 进入容器
```docker
docker attach 容器名
docker exec -it 容器名 bash
```
- exec vs attach
    - attach 不会启动新的进程
    - exec 会启动新的进程
##### 4.2.2.3. 停止容器
```
docker stop/kill/restart 容器名
```

##### 4.2.2.4. 删除容器
```
docker rm -v $(docker ps -aq -f status=exited)
```

##### 4.2.2.5. 查看容器日志
```
docker logs -f 容器名
```
### 4.3. Docker网络
#### 4.3.1. 单个host网络
##### 4.3.1.1. none
##### 4.3.1.2. host
##### 4.3.1.3. bridge
#### 4.3.2. 跨多个host网络
### 4.4. Docker存储
#### 4.4.1. 什么是Docker存储
容器运行产生的数据存放在哪里
#### 4.4.2. storage driver
默认。适用于无状态应用，容器销毁时数据也跟着销毁
#### 4.4.3. Docker Volumn
把Host文件系统上的目录或者文件挂载到容器，可以持久化存储

### 4.5. Docker镜像源
如果设置了科学上网那么可以不用设置镜像源

## 5. Docker安装
[Install Docker Engine on Debian \| Docker Documentation](https://docs.docker.com/engine/install/debian/)
[Docker 换源 \- 腾讯云开发者社区\-腾讯云](https://cloud.tencent.com/developer/article/1769231)
[How to Create a MySql Instance with Docker Compose \| by Chris Chuck \| Medium](https://medium.com/@chrischuck35/how-to-create-a-mysql-instance-with-docker-compose-1598f3cc1bee)
[How To Install Docker Compose on Debian 10 \| DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-install-docker-compose-on-debian-10)
## 6. Docker架构
![](https://raw.githubusercontent.com/TDoct/images/master/1630735528_20210904114458312_5390.png)
## 7. Docker原理
Docker用来创建容器，而容器就是一个特殊的进程（即我们的应用进程），他所运行的环境是由Linux Namespace、Linux cgroups、rootfs构建出来的

### 7.1. 隔离
进程在创建时，被制定了一组Linux Namespace参数
[Linux Namespace.md](../../Operating_System/Linux/虚拟化/Linux%20Namespace.md)
### 7.2. 限制
这个进程作为Linux cgroup的tasks来限制运行
[Linux cgroup.md](../../Operating_System/Linux/虚拟化/Linux%20cgroup.md)
### 7.3. 文件系统
容器进程看到的文件系统是隔离的，这个文件系统叫做容器镜像或者rootfs
他是通过AUFS+chroot+mount Namespace实现的
[Linux AUFS.md](../../Operating_System/Linux/虚拟化/Linux%20AUFS.md)
[chroot.md](../../Operating_System/Linux/命令/chroot.md)

![](https://raw.githubusercontent.com/TDoct/images/master/1630726303_20210904113139294_21882.png)
## 8. 参考
- [Docker \(software\) \- Wikipedia](https://en.wikipedia.org/wiki/Docker_(software))
- [每天5分钟玩转Docker容器技术\-CloudMan\-微信读书](https://weread.qq.com/web/reader/93d325a0719b200493d5ba9ka87322c014a87ff679a21ea)
- [深入剖析Kubernetes · 捕风的逍遥侯/geek\_crawler \- 码云 \- 开源中国](https://gitee.com/aohanhongzhi/geek_crawler/tree/feature/special-course/%E6%B7%B1%E5%85%A5%E5%89%96%E6%9E%90Kubernetes)
- [What is a Docker Image? Introduction and use cases](https://searchitoperations.techtarget.com/definition/Docker-image)
- [What is a Container? \| App Containerization \| Docker](https://www.docker.com/resources/what-container)