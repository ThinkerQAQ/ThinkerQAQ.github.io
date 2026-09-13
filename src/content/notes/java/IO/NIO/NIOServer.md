---
title: "3.18 NIOServer"
description: "1. 例子 - server - client 2. 参考 - Java Network IO \\(BIO,NIO,AIO\\)"
sourcePath: "Java/IO/NIO/NIOServer.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 118
tags: ["Java"]
createdAt: "2020-08-02T09:09:58Z"
updatedAt: "2020-08-02T09:13:17Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 例子

- server

```java
public class NioSocketServer implements Runnable{
    //1 Multiplexer (manage all channels)
    private Selector selector;
    // Read buffer
    private ByteBuffer readBuffer = ByteBuffer.allocate(1024);

    public NioSocketServer() {
        try {
            // 1. Turn on multiplexer
            selector = Selector.open();
            //2. Open Server Channel (Network Read-Write Channel)
            ServerSocketChannel serverSocketChannel = ServerSocketChannel.open();
            // 3. Set the server channel as non-blocking mode, true as blocking mode and false as non-blocking mode.
            serverSocketChannel.configureBlocking(false);
            // 4. Binding ports
            serverSocketChannel.bind(new InetSocketAddress("127.0.0.1",8765));
            // 5 Register Server Channel to Multiplexer
            // SelectionKey.OP_READ: Expresses concern about read data ready events
            // SelectionKey.OP_WRITE: Expresses concern about write data ready events
            // SelectionKey.OP_CONNECT: Expresses concern about socket channel connection completion events
            // SelectionKey.OP_ACCEPT: Expresses concern about the accept event of server-socket channel
            serverSocketChannel.register(selector,SelectionKey.OP_ACCEPT);
            System.out.println("Server initialization completed-------------");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void run() {
        while(true){
            try {
                /**
                 * a.select() Blocked to at least one channel ready for your registered event
                 * b.select(long timeOut) Blocked to at least one channel ready for your registered event or timeOut timeout
                 * c.selectNow() Return immediately. If there is no ready channel, return to 0
                 * select The return value of the method represents the number of ready channels.
                 */
                // 1. Multiplexer listening blocking
                selector.select();
                // 2. Result Set Selected by Multiplexer
                Iterator<SelectionKey> selectionKeys = selector.selectedKeys().iterator();
                // 3. Continuous polling
                while (selectionKeys.hasNext()) {
                    // 4. Get a selected key
                    SelectionKey key = selectionKeys.next();
                    // 5. Remove it from the container after acquisition
                    selectionKeys.remove();
                    // 6. Get only valid key s
                    if (!key.isValid()) {
                        continue;
                    }
                    // Blocking state processing
                    if (key.isAcceptable()) {
                        accept(key);
                    }
                    // Readable state processing
                    if (key.isReadable()) {
                        read(key);
                    }
                }
                } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
    // Set the block and wait for the Client request. In traditional IO programming, ServerSocket and Socket are used. Server Socket Channel and Socket Channel used in NIO
    private void accept(SelectionKey selectionKey) {
        try {
            // 1. Access Channel Service
            ServerSocketChannel serverSocketChannel = (ServerSocketChannel) selectionKey.channel();
            // 2. Execution of blocking methods
            SocketChannel socketChannel = serverSocketChannel.accept();
            // 3. Set the server channel as non-blocking mode, true as blocking mode and false as non-blocking mode.
            socketChannel.configureBlocking(false);
            // 4. Register channels on multiplexers and set read identifiers
            socketChannel.register(selector, SelectionKey.OP_READ);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    private void read(SelectionKey selectionKey) {
        try {
            // 1. Emptying Buffer Data
            readBuffer.clear();
            // 2. Get the channel registered on the multiplexer
            SocketChannel socketChannel = (SocketChannel) selectionKey.channel();
            // 3. Read the data and return it.
            int count = socketChannel.read(readBuffer);
            // 4. Return content - 1 indicates no data
            if (-1 == count) {
                selectionKey.channel().close();
                selectionKey.cancel();
                return ;
            }
            // 5. If there is data, reset operation is performed before reading data.
            readBuffer.flip();
            // 6. Create a bytes array of the corresponding size according to the buffer size to get the value
            byte[] bytes = new byte[readBuffer.remaining()];
            // 7. Receiving Buffer Data
            readBuffer.get(bytes);
            // 8. Print the acquired data
            System.out.println("NIO Server : " + new String(bytes)); // You cannot use bytes.toString()
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        new Thread(new NioSocketServer()).start();
    }
}
```

- client

```java
public class NioSocketClient {
    public static void main(String[] args) {
        // 1. Create a connection address
        InetSocketAddress inetSocketAddress = new InetSocketAddress("127.0.0.1", 8765);
        // 2. Declare a connection channel
        SocketChannel socketChannel = null;
        // 3. Create a buffer
        ByteBuffer byteBuffer = ByteBuffer.allocate(1024);
        try {
            // 4. Open the Channel
            socketChannel = SocketChannel.open();
            // 5. Connecting servers
            socketChannel.connect(inetSocketAddress);
            while(true){
                // 6. Define a byte array, and then use the system input function:
                byte[] bytes = new byte[1024];
                // 7. Keyboard input data
                System.in.read(bytes);
                // 8. Put the data in the buffer
                byteBuffer.put(bytes);
                // 9. Reset the buffer
                byteBuffer.flip();
                // 10. Write out the data
                socketChannel.write(byteBuffer);
                // 11. Emptying Buffer Data
                byteBuffer.clear();
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (null != socketChannel) {
                try {
                    socketChannel.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
```

## 2. 参考
- [Java Network IO \(BIO,NIO,AIO\)](https://programmer.group/java-network-io-bio-nio-aio.html)
