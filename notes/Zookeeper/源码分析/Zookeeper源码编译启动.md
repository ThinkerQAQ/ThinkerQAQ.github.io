[toc]
## 1. 启动类是什么
- 从zkServer.sh 71行的位置里可以看出
```java
ZOOMAIN="org.apache.zookeeper.server.quorum.QuorumPeerMain"
```

- 启动后使用jps -l也可以看出
```
org.apache.zookeeper.server.quorum.QuorumPeerMain
```

## 2. 源码启动

### 2.1. Ant环境
#### 2.1.1. 配置Ant环境

- 下载
[Apache Ant \- Binary Distributions](https://ant.apache.org/bindownload.cgi)
- 解压
![](https://raw.githubusercontent.com/TDoct/images/master/1585744591_20200401202208337_9675.png)
- 配置PATH
![](https://raw.githubusercontent.com/TDoct/images/master/1585744592_20200401202254473_4121.png)

- 测试
```
ant -version
```

#### 2.1.2. clone代码并用Ant编译
- clone
```git
git clone git@github.com:apache/zookeeper.git
```
- ant编译
```
ant eclipse
```

#### 2.1.3. 导入IDEA
![](https://raw.githubusercontent.com/TDoct/images/master/1585744593_20200401202509610_32236.png)


#### 2.1.4. 新建一个Version文件

```java
package org.apache.zookeeper.version;

/**
 * @description:
 * @author: zsk
 * @create: 2020-04-01 21:28
 **/
public interface Info
{
    int MAJOR=1;
    int MINOR=0;
    int MICRO=0;
    String QUALIFIER=null;
    int REVISION=-1; //TODO: remove as related to SVN VCS
    String REVISION_HASH="1";
    String BUILD_DATE="2019-3-4";
}

```

#### 2.1.5. 启动

- 参数

```java
-Dlog4j.configuration=file:C:\Users\zsk\code\demo\zookeeper-3.4.14\conf\log4j.properties

C:\Users\zsk\code\demo\zookeeper-3.4.14\conf\zoo.cfg
```

![](https://raw.githubusercontent.com/TDoct/images/master/1585816488_20200401213742429_32678.png)


### 2.2. Maven环境

#### 2.2.1. 编译
直接导入根项目就行，然后执行
```
mvn clean package install -Dmaven.test.skip=true
```
#### 2.2.2. 新建一个Version文件

```java
package org.apache.zookeeper.version;

/**
 * @description:
 * @author: zsk
 * @create: 2020-04-01 21:28
 **/
public interface Info
{
    int MAJOR=1;
    int MINOR=0;
    int MICRO=0;
    String QUALIFIER=null;
    int REVISION=-1; //TODO: remove as related to SVN VCS
    String REVISION_HASH="1";
    String BUILD_DATE="2019-3-4";
}

```

#### 2.2.3. 启动
![](https://raw.githubusercontent.com/TDoct/images/master/1585816488_20200401213742429_32678.png)

## 3. 参考
- [Zookeeper源码编译（Zookeeper 3\.4\.11\)并IDEA启动\_大数据\_Simon的博客\-CSDN博客](https://blog.csdn.net/Simon_09010817/article/details/91843048)
- [zookeeper源码编译的坑\_大数据\_yu\_kang的博客\-CSDN博客](https://blog.csdn.net/yu_kang/article/details/88201676)
- [【ZooKeeper系列】3\.ZooKeeper源码环境搭建 \- 猿人谷 \- SegmentFault 思否](https://segmentfault.com/a/1190000021451833)