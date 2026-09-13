---
title: "3.7 AIOServer"
description: "1. 例子 - server - client 2. 参考 - Java Network IO \\(BIO,NIO,AIO\\)"
sourcePath: "Java/IO/AIO/AIOServer.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 107
tags: ["Java"]
createdAt: "2020-08-02T09:10:26Z"
updatedAt: "2020-08-02T09:12:40Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 例子

- server

```java
public class AioSocketServer {
    private ExecutorService executorService;          // Thread pool
    private AsynchronousChannelGroup threadGroup;      // Channel group
    public AsynchronousServerSocketChannel asynServerSocketChannel;  // Server channel
    public void start(Integer port){
        try {
            // 1. Create a cache pool
            executorService = Executors.newCachedThreadPool();
            // 2. Creating Channel Groups
            threadGroup = AsynchronousChannelGroup.withCachedThreadPool(executorService, 1);
            // 3. Create server channels
            asynServerSocketChannel = AsynchronousServerSocketChannel.open(threadGroup);
            // 4. Binding
            asynServerSocketChannel.bind(new InetSocketAddress(port));
            System.out.println("server start , port : " + port);
            // 5. Waiting for Client Request
            asynServerSocketChannel.accept(this, new AioServerHandler());
            // The server is blocked all the time, and the real environment is running under tomcat, so this line of code is not needed.
            Thread.sleep(Integer.MAX_VALUE);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    public static void main(String[] args) {
        AioSocketServer server = new AioSocketServer();
        server.start(8888);
    }
}

public class AioServerHandler  implements CompletionHandler<AsynchronousSocketChannel, AioSocketServer> {
    private final Integer BUFFER_SIZE = 1024;
    @Override
    public void completed(AsynchronousSocketChannel asynSocketChannel, AioSocketServer attachment) {
        // Ensure that multiple clients can block
        attachment.asynServerSocketChannel.accept(attachment, this);
        read(asynSocketChannel);
    }
    //Read data
    private void read(final AsynchronousSocketChannel asynSocketChannel) {
        ByteBuffer byteBuffer = ByteBuffer.allocate(BUFFER_SIZE);
        asynSocketChannel.read(byteBuffer, byteBuffer, new CompletionHandler<Integer, ByteBuffer>() {
            @Override
            public void completed(Integer resultSize, ByteBuffer attachment) {
                //After reading, reset the identifier bit
                attachment.flip();
                //Get the number of bytes read
                System.out.println("Server -> " + "The length of data received from the client is:" + resultSize);
                //Get the read data
                String resultData = new String(attachment.array()).trim();
                System.out.println("Server -> " + "The data information received from the client is:" + resultData);
                String response = "Server response, Received data from client: " + resultData;
                write(asynSocketChannel, response);
            }
            @Override
            public void failed(Throwable exc, ByteBuffer attachment) {
                exc.printStackTrace();
            }
        });
    }
    // Write data
    private void write(AsynchronousSocketChannel asynSocketChannel, String response) {
        try {
            // Write the data into the buffer
            ByteBuffer buf = ByteBuffer.allocate(BUFFER_SIZE);
            buf.put(response.getBytes());
            buf.flip();
            // Write from buffer to channel
            asynSocketChannel.write(buf).get();
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (ExecutionException e) {
            e.printStackTrace();
        }
    }
    @Override
    public void failed(Throwable exc, AioSocketServer attachment) {
        exc.printStackTrace();
    }
}
```


- client

```java
public class AioSocketClient  implements Runnable{
    private static Integer PORT = 8888;
    private static String IP_ADDRESS = "127.0.0.1";
    private AsynchronousSocketChannel asynSocketChannel ;
    public AioSocketClient() throws Exception {
        asynSocketChannel = AsynchronousSocketChannel.open();  // Open the channel
    }
    public void connect(){
        asynSocketChannel.connect(new InetSocketAddress(IP_ADDRESS, PORT));  // Creating connections is the same as NIO
    }
    public void write(String request){
        try {
            asynSocketChannel.write(ByteBuffer.wrap(request.getBytes())).get();
            ByteBuffer byteBuffer = ByteBuffer.allocate(1024);
            asynSocketChannel.read(byteBuffer).get();
            byteBuffer.flip();
            byte[] respByte = new byte[byteBuffer.remaining()];
            byteBuffer.get(respByte); // Put buffer data into byte arrays
            System.out.println(new String(respByte,"utf-8").trim());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    @Override
    public void run() {
        while(true){
        }
    }
    public static void main(String[] args) throws Exception {
        for (int i = 0; i < 10; i++) {
            AioSocketClient myClient = new AioSocketClient();
            myClient.connect();
            new Thread(myClient, "myClient").start();
            myClient.write("aaaaaaaaaaaaaaaaaaaaaa");
        }
    }
}
```

## 2. 参考
- [Java Network IO \(BIO,NIO,AIO\)](https://programmer.group/java-network-io-bio-nio-aio.html)
