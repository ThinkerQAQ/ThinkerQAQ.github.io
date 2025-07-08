## 1. 源码安装
1. 下载源码
- [Redis](https://redis.io/download)
2. 安装开发环境包
```bash
sudo apt-get install build-essential tcl ruby rubygems
```
3. 编译
```bash
cd src
make MALLOC=libc
```
4. 安装
- redis*
```gcc
make install PREFIX=/home/zsk/software/redis/redis0
mkdir -p redis0/{conf,data,log}
cp src/redis-trib.rb /home/zsk/software/redis/redis0/bin/
cp redis-5.0.8/*.conf redis0/conf/
```
5. 配置
    - 备份并且移除注释
    ```bash
    mv redis.conf redis_bak.conf
    cat redis_bak.conf | grep -v "#" | grep -v "^$" > redis.conf
    ```

    - 最核心的配置

    ```conf
    daemonize yes
    bind 127.0.0.1
    port 6379
    dir "/home/zsk/software/redis/redis0/data"
    logfile "/home/zsk/software/redis/redis0/log/6379.log"
    ```

6. 启动并测试

```bash
bin/redis-server conf/redis.conf
bin/redis-cli -p 6379
```

