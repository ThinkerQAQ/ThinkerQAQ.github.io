## 1. 什么是文件
文件是由字节序列组成的，在Linux下一切皆文件
所有的IO设备都是文件
    - /dev/sda2    (/usr disk partition)
    - /dev/tty2    (terminal)
内核也是文件
    - /boot/vmlinuz-3.13.0-55-generic (kernel image) 
    - /proc  (kernel data structures)

## 2. 文件分类
### 2.1. Regular file
- 包含任意数据。
- 从应用程序看有两种：文本文件和二进制文件
    - 文本文件只包含ASCII或者Unicode字符
        - 由文本行组成，每行有一个终结符
            - Linux下是\n
            - Windows下是\r\n
    - 二进制则是除文本文件外的其他文件
        - 图片
        - 可执行程序
- 文件元数据
    - 由内核维护，用户态可以用stat和fstat访问
    
    ```c
    /* Metadata returned by the stat and fstat functions */
    struct stat {
        dev_t         st_dev;      /* Device */
        ino_t         st_ino;      /* inode */
        mode_t        st_mode;     /* Protection and file type */
        nlink_t       st_nlink;    /* Number of hard links */
        uid_t         st_uid;      /* User ID of owner */
        gid_t         st_gid;      /* Group ID of owner */
        dev_t         st_rdev;     /* Device type (if inode device) */
        off_t         st_size;     /* Total size, in bytes */
        unsigned long st_blksize;  /* Blocksize for filesystem I/O */
        unsigned long st_blocks;   /* Number of blocks allocated */
        time_t        st_atime;    /* Time of last access */
        time_t        st_mtime;    /* Time of last modification */
        time_t        st_ctime;    /* Time of last change */
    };
    ```
- 内核如何表示打开的文件
    - 一个进程打开了两个不同的文件
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1599998815_20200913200641587_14074.png)
    - 一个进程打开同一个文件两次
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1599998953_20200913200909646_12404.png)
- 进程如何共享文件
    - fork调用
        - fork调用之前
            - ![](https://raw.githubusercontent.com/TDoct/images/master/1599999022_20200913200957016_31493.png)
        - fork调用之后：子进程继承了父进程的所有文件
            - ![](https://raw.githubusercontent.com/TDoct/images/master/1599999023_20200913201018390_10885.png)
- IO重定向
    - dup2
        - dup2调用之前
            - ![](https://raw.githubusercontent.com/TDoct/images/master/1599999393_20200913201605901_4574.png)
        - dup2调用之后
            - ![](https://raw.githubusercontent.com/TDoct/images/master/1599999395_20200913201617757_20472.png)
### 2.2. Directory
- 由link组成
    - 每个link是文件名->文件的映射
    - 至少由两个link
        - .
        - ..
- 所有的文件组织成文件树
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1599996729_20200913193204292_7688.png)
- 内核给每个进程维护了当前工作目录
- 文件的位置由文件路径标识
    - /是绝对路径
    - ../是相对路径
### 2.3. Socket
不同机器上的进程之间的通信

### 2.4. Named pipes (FIFOs)
### 2.5. Symbolic links
### 2.6. Character and block devices

## 3. 文件操作
### 3.1. Opening Files
- 告诉内核准备访问某个文件
- open()
    - 返回值是integer，表示文件描述符
        - 如果是-1表示发生了错误
    - 例子

    ```c
    int fd;   /* file descriptor */

    if ((fd = open("/etc/hosts", O_RDONLY)) < 0) {
       perror("open");
       exit(1);
    }
    ```
- 由Linux shell创建的进程有三个初始的文件描述符
    - 0: standard input (stdin)
    - 1: standard output (stdout)
    - 2: standard error (stderr)
### 3.2. Closing Files
- 告诉内核停止访问某个文件
- close()
    - 例子
    
    ```c
    int fd;     /* file descriptor */
    int retval; /* return value */

    if ((retval = close(fd)) < 0) {
       perror("close");
       exit(1);
    }
    ```
### 3.3. Reading Files
- 拷贝文件的字节数据到内存中，并且更新position
- open()
    - 返回读取进入buf的字节数
        - 如果<0表示发生了错误
        - 返回值可能小于buf的长度
            - 以下几种情况会发生
                - 读取到了EOF
                - 从terminal读取一行
                - 读取socket
            - 以下情况不会发生
                - 从磁盘文件读取
    - 例子
    
    ```c
    char buf[512];
    int fd;       /* file descriptor */
    int nbytes;   /* number of bytes read */

    /* Open file fd ...  */
    /* Then read up to 512 bytes from file fd */
    if ((nbytes = read(fd, buf, sizeof(buf))) < 0) {
       perror("read");
       exit(1);
    }
    ```
### 3.4. Writing Files
- 拷贝内存中的字节数据到文件中，并且更新position
- write()
    - 返回从buf写入文件的字节数
        - 如果<0表示发生了错误
        - 返回值可能小于buf的长度
            - 以下几种情况会发生
                - 写socket
            - 以下情况不会发生
                - 写入磁盘文件
    - 例子
    
    ```c
    char buf[512];
    int fd;       /* file descriptor */
    int nbytes;   /* number of bytes read */

    /* Open the file fd ... */
    /* Then write up to 512 bytes from buf to file fd */
    if ((nbytes = write(fd, buf, sizeof(buf)) < 0) {
       perror("write");
       exit(1);
    }
    ```
- Changing the current file position (seek)
    - indicates next offset into file to read or write
    - lseek()
### 3.5. Standard I/O
- libc.so包含了high level的IO
- 把文件看作流
    - 文件描述符+内存中的buffer的抽象
        - 为什么要有buffer
            - Unix IO调用很昂贵
        - 可以调用fflush把buffer刷新到文件
            - ![](https://raw.githubusercontent.com/TDoct/images/master/1599999738_20200913202130477_30769.png)
- 最开始由三个流
    - stdin  (standard input)
    - stdout (standard output)
    - stderr (standard error)

#### 3.5.1. 文件操作
Opening and closing files (fopen and fclose)
Reading and writing bytes (fread and fwrite)
Reading and writing text lines (fgets and fputs)
Formatted reading and writing (fscanf and fprintf)
### 3.6. Unix I/O vs C Standard I/O
|           |     Unix I/O      | C Standard I/O |
| ------ | ---------------- | ------------------ |
| level | system-level | C level                |


![](https://raw.githubusercontent.com/TDoct/images/master/1599995689_20200913191444031_9977.png)

## 4. IO过程
- IO（输入/输出）主要分为两个阶段。
    - 磁盘或者网络<->内核区
    - 内核区<->用户区
- ![IO多路复用-IO过程](https://raw.githubusercontent.com/TDoct/images/master/1628920076_20210814134726483_30491.png)
## 5. IO类型
### 5.1. 缓冲IO/标准IO
- 经过文件系统并且使用了内核缓冲区（Page Cache）
- 由C语言提供的库函数，名字由f打头
    ```c
    fopen, fclose, fseek, fflush
    fread, fwrite, fprintf, fscanf
    ```
- ![Linux IO-缓冲IO](https://raw.githubusercontent.com/TDoct/images/master/1628913228_20210814114429351_3196.png)
### 5.2. 直接IO
- 经过文件系统但是没有使用内核缓冲区（Page Cache）
- Linux系统的系统API
    ```c
    open, close, lseek, fsync
    read, write
    pread, pwrite
    ```
- ![Linux IO-直接IO](https://raw.githubusercontent.com/TDoct/images/master/1628913230_20210814114441528_20388.png)
### 5.3. 裸IO
- 绕过了文件系统，直接操作磁盘

## 6. 零拷贝
- [零拷贝机制.md](零拷贝机制.md)
## 7. IO模型
- [IO模型.md](IO模型.md)