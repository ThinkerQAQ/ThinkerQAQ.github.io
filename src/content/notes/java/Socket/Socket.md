---
title: "10.Socket"
description: "1. 基础 Socket本质上就是IO，所以Socket的操作和IO基本类似。Socket的主题其实就是IO，NIO的主题 2. TCP 服务器通过ServerSocket监听在某个端口（NIO的ServerSocketChannel） 客户端通过Socket链接服务器（NIO的SocketChan"
sourcePath: "Java/Socket/Socket.md"
category: "java"
categoryLabel: "Java"
topic: "Socket"
topicLabel: "10.Socket"
order: 218
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-02-11T14:14:56Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 1. 基础

Socket本质上就是IO，所以Socket的操作和IO基本类似。Socket的主题其实就是IO，NIO的主题

## 2. TCP

服务器通过ServerSocket监听在某个端口（NIO的ServerSocketChannel）
客户端通过Socket链接服务器（NIO的SocketChannel）
客户端发送数据
服务器接受数据，处理并返回
客户端收到数据
客户端或者服务器关闭链接

### 2.1. Socket
```
//创建socket
Socket socket = new Socket("jenkov.com", 80);
//获取输出流写
OutputStream out = socket.getOutputStream();
out.write("some data".getBytes());//面向字节流
out.flush();//从OS Cache刷入磁盘
out.close();

//获取输入流读
InputStream in = socket.getInputStream();

int data = in.read();
//... read more data...

in.close();

//关闭
socket.close();
```

- 注意
服务器关闭时read方法返回-1，然而我们不能使用-1来判断是否读取完成，因为可能会出现粘包分包的现象
解决方案是首先确定长度在读取，或者在数据末尾设置特殊标记

### 2.2. ServerSocket
```
//创建ServerSocket并监听在9000端口
ServerSocket serverSocket = new ServerSocket(9000);


boolean isStopped = false;
while(!isStopped){
    Socket clientSocket = serverSocket.accept();//监听客户端连接，会发生阻塞

    //do something with clientSocket

    clientSocket.close();
}

serverSocket.close();
```


## 3. UDP


### 3.1. 与TCP的区别
- 不用建立链接
- UDP不可靠
- 无法保证数据被另一方接受
- 无法保证packet的传输顺序


### 3.2. 使用场景
不在乎数据是否丢失，但对实时性要求高

### 3.3. 例子
```
byte[] buffer = new byte[65508];//UDP最大啊长度65535，头部26。那么剩余长度65508
InetAddress address = InetAddress.getByName("jenkov.com");

//创建socket
DatagramPacket packet = new DatagramPacket(
    buffer, buffer.length, address, 9000);
//发送数据
datagramSocket.send(packet);


DatagramSocket datagramSocket = new DatagramSocket(80);//可与TCP一起监听80端口

byte[] buffer = new byte[10];
DatagramPacket packet = new DatagramPacket(buffer, buffer.length);

//读取数据需要放在循环里
datagramSocket.receive(packet);
```





## 4. 通信协议设计

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229203136.png)
如果有大量数据那么需要多个往返

### 4.1. 区分请求结束和响应结束
- 发送长度
    - 优点
    没有结束标记的开销
    - 缺点
    数据传输前需要知道数据的长度，因此需要先缓存数据
- 使用分隔符
需要一个个字节读取，效率慢
