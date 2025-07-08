[toc]


## 1. 安装MySQL步骤

### 1.1. 安装

```java
sudo apt install mysql-server

```

### 1.2. 启动

```java
sudo service mysql start
```

### 1.3. 设置root密码

```java
sudo mysql_secure_installation

```

### 1.4. 创建用户

```java
CREATE USER 'zsk'@'localhost' IDENTIFIED BY 'zskadmin';
GRANT ALL PRIVILEGES ON *.* TO 'zsk'@'localhost' WITH GRANT OPTION;
```

### 1.5. 修改监听端口

```
vim  /etc/mysql/mysql.conf.d/mysqld.cnf
#bind-address:127.0.0.1
```

## 2. 默认配置


### 2.1. 打印默认配置信息
```
mysqld --help --verbose
```


### 2.2. 配置文件位置
```
/etc/my.cnf /etc/my.cnf.d/ ~/.my.cnf
```


### 2.3. 基础配置

#### 2.3.1. log-bin
主要用于主从复制
```
log-bin=/var/lib/mysql/mysql-bin
```


#### 2.3.2. log-error
记录错误信息
```
log-err=/var/lib/mysql/mysql-err
```


### 2.4. 查询日志
记录慢查询信息

### 2.5. 数据文件
默认位置/var/lib/mysql
frm文件是表结构
myd存的表数据
myi存的是表索引

## 3. 安装目录
-  mysqld
    - mysqld 这个可执行文件就代表着 MySQL 服务器程序，运行这个可执行文件就可以直接启动一个服务器进程
- mysqld_safe
    - mysqld_safe 是一个启动脚本，它会间接的调用 mysqld ，而且还顺便启动了另外一个监控进程
    - 监控进程在服务器进程挂了的时候，可以帮助它重启
    - 另外，使用 mysqld_safe 启动服务器程序时，它会将服务器程序的出错信息和其他诊断信息重定向到某个文件中，产生出错日志，这样可以方便我们找出发生错误的原因
- mysql.server
    - mysql.server 也是一个启动脚本，它会间接的调用 mysqld_safe ，在调用 mysql.server 时在后边指定 start 参数就可以启动服务器程序了
- mysqld_multi
    - 单机多实例命令
## 4. 参考
- [How To Install MySQL on Ubuntu 18\.04 \| DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-install-mysql-on-ubuntu-18-04)
- [Windows子系统ubuntu安装及卸载MySQL5\.7 \- 简书](https://www.jianshu.com/p/84e7c3b2957c)
- [MySQL :: MySQL 5\.7 Reference Manual :: 13\.7\.1\.7 SET PASSWORD Statement](https://dev.mysql.com/doc/refman/5.7/en/set-password.html)
- [Linux安装mysql5\.7\.26 \-\-（傻瓜版3分钟搞定） \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1451186)