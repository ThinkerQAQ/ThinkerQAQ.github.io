---
title: "3.14 BIOServer"
description: "1. 例子 - server - client 2. 参考 - Java Network IO \\(BIO,NIO,AIO\\)"
sourcePath: "Java/IO/BIO/BIOServer.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 114
tags: ["Java"]
createdAt: "2020-08-02T09:08:30Z"
updatedAt: "2020-08-02T09:12:58Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 例子
- server

```java
public class BioSocketServer {
    public static void main(String[] args) {
        ServerSocket serverSocket = null;
        Socket socket = null;
        try {
            //socket address
            SocketAddress socketAddress = new InetSocketAddress("127.0.0.1",8765);
            // Create ServerScoket Server
            serverSocket = new ServerSocket();
            // Binding address
            serverSocket.bind(socketAddress);
            // Loop Blocking Waiting for Client Connection
            while(true){
                socket = serverSocket.accept();
                //Create a new thread to execute the client's request and reply to the response
                Thread thread = new Thread(new BioSocketHandler(socket));
                thread.start();
            }

        } catch (IOException e) {
            e.printStackTrace();
        }finally {
            if(serverSocket != null){
                try {
                    serverSocket.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            serverSocket = null;
        }
    }
}



public class BioSocketHandler implements Runnable {
    private Socket socket;

    public BioSocketHandler(Socket socket) {
        this.socket = socket;
    }

    @Override
    public void run() {
        BufferedReader in = null;
        PrintWriter out = null;
        try {
            in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            out = new PrintWriter(new OutputStreamWriter(socket.getOutputStream()),true);
            String request;
            request = in.readLine();
            //Receive client requests and respond
            System.out.println(request);
            out.println("Bio Server response data response");
        } catch (IOException e) {
            e.printStackTrace();
        }finally {
            if(in != null){
                try {
                    in.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            if(out != null){
                try {
                    out.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            if(socket != null){
                try {
                    socket.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            socket = null;
        }
    }
}
```

- client

```java
public class BioSocketClient {
    public static void main(String[] args) {
        Socket socket =null;
        PrintWriter out = null;
        BufferedReader in = null;
        try {
            // Create Socket
            socket = new Socket();
            SocketAddress socketAddress = new InetSocketAddress("127.0.0.1",8765);
            //Connect servers
            socket.connect(socketAddress);
            out = new PrintWriter(new OutputStreamWriter(socket.getOutputStream()),true);
            in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            //Send a request to the server
            out.println("Bio Client sends request information  request");
            String response;
            //Receive server response data
            response = in.readLine();
            System.out.println(new String(response));
        } catch (IOException e) {
            e.printStackTrace();
        }finally {
            if(in != null){
                try {
                    in.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            if(out != null){
                try {
                    out.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            if(socket != null){
                try {
                    socket.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            socket = null;
        }
    }
}
```

## 2. 参考
- [Java Network IO \(BIO,NIO,AIO\)](https://programmer.group/java-network-io-bio-nio-aio.html)
