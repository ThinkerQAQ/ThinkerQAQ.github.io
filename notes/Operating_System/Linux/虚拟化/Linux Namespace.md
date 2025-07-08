## 1. Linux Namespace历史
- Linux 内核 2.4版本支持mount namespace
- Linux 内核 2.6版本支持了大多数的namespace，比如 IPC、Network、PID、和 UTS
- Linux 内核 3.8版本支持User namespace

## 2. 什么是Linux Namespace
limits what you can see
Linux内核的一种特性，**隔离**进程能看到的资源。这些资源包括process IDs, hostnames, user IDs, file names, network access, IPC等
## 3. Linux Namespace分类
### 3.1. Mount (mnt)
文件系统挂载点
### 3.2. Process ID (pid)
进程ID
### 3.3. Network (net)
网络设备，协议栈、端口等
### 3.4. Interprocess Communication (ipc)
System V IPC, POSIX 消息队列等
### 3.5. UTS
主机名和NIS域名
### 3.6. User ID (user)
用户ID和用户组ID
## 4. 为什么需要Linux Namespace
通过资源隔离从而支持虚拟化，比如容器技术

## 5. 如何使用Linux Namespace
### 5.1. 查看进程所属的namespace
`/proc/[pid]/ns`
### 5.2. clone()
创建新的进程
### 5.3. setns()
允许指定进程加入特定的namespace
## 6. unshare()
将指定进程移除指定的namespace

## 7. Linux Namespace原理

## 8. 参考
- [Linux namespaces \- Wikipedia](https://en.wikipedia.org/wiki/Linux_namespaces#History)
- [Linux Namespace : 简介 \- sparkdev \- 博客园](https://www.cnblogs.com/sparkdev/p/9365405.html?utm_source=pocket_mylist)
- [Linux内核中有哪些比较牛逼的设计? \- 知乎](https://www.zhihu.com/question/332710035/answer/1854780284?utm_oi=1337530756479447041&utm_source=pocket_mylist)
- [Linux Namespace 是什么，可以用来做什么？ \- 知乎](https://www.zhihu.com/question/24964878?utm_source=pocket_mylist)
- [Linux Namespace : User \- sparkdev \- 博客园](https://www.cnblogs.com/sparkdev/p/9462838.html)
- [Linux Namespace : Network \- sparkdev \- 博客园](https://www.cnblogs.com/sparkdev/p/9462762.html)
- [Linux Namespace : PID \- sparkdev \- 博客园](https://www.cnblogs.com/sparkdev/p/9442208.html)
- [Linux Namespace : Mount \- sparkdev \- 博客园](https://www.cnblogs.com/sparkdev/p/9424649.html)
- [Linux Namespace : IPC \- sparkdev \- 博客园](https://www.cnblogs.com/sparkdev/p/9400673.html)
- [Linux Namespace : UTS \- sparkdev \- 博客园](https://www.cnblogs.com/sparkdev/p/9377072.html)