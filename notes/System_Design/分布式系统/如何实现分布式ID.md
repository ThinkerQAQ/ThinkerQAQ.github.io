[toc]
 
## 1. 分布式ID是什么
分布式环境（多台机器）下唯一的ID
分布式ID的特性
- 全局唯一
    - ID嘛，当然得保证唯一性
- 趋势递增
    - 递增是为了适应MySQL InnoDB存储引擎聚簇索引的特点
    - 趋势而不是顺序是为了防止认为猜测到ID生成策略从而进行攻击 可以加个时间戳
- 高并发
    - 淘宝双十一：10亿/24小时/60分/60秒=1.2万/s
- 高可用
    - 其他服务调用ID生成服务，如果ID生成服务挂了，那么业务整体就就瘫痪了
## 2. 如何实现分布式ID
### 2.1. 数据库自增
1. 如果是主键ID可以使用自增策略，如 MySQL 的`auto_increment`；不是的话可以自定义sequence
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1592724776_20200621125857960_4173.png)
2. 搭建集群，主主同步（主从只是用来读写分离，主从很少用）
    - master1从0开始自增，步长为2，master2从1开始自增，步长为2 但是增加机器的时候需要重新分配ID麻烦
#### 2.1.1. 问题
不满足高并发的要求，而且搭建数据库集群仅用来生成ID很浪费资源
### 2.2. UUID
结合机器的网卡、当地时间、一个随记数来生成UUID

- UUID1：时间
    - 通过计算当前时间戳、随机数和机器MAC地址得到
    - 唯一性：由于在算法中使用了MAC地址，这个版本的UUID可以保证在全球范围的唯一性
    - 缺点：使用MAC地址会带来安全性问题
    - 一般用这个
- UUID2：DCE安全
    - 和基于时间的UUID算法相同，但会把时间戳的前4位置换为POSIX的UID或GID
    - 较少用到
- UUID3：MD5
    - 基于名字的UUID通过计算名字和名字空间的MD5散列值得到
    - 唯一性：相同名字空间中不同名字生成的UUID的唯一性；不同名字空间中的UUID的唯一性
    - 缺点：相同名字空间中相同名字的UUID重复生成是相同的
- UUID4：随机数
    - 伪随机数，可能重复
- UUID5：SHA1
    - 和UUID3一样，只不过算法改成了SHA1


#### 2.2.1. 问题
不满足趋势递增的要求
### 2.3. Redis生成ID
1. Redis的命令是单线程的，且提供incr的原子命令
2. Redis cluster方案: 假设3主3从, 主1可以建一个key: id1 从0开始步长为3, 主2可以建一个key: id2 从1开始步长为3, 主3可以将一个key: id3 从2开始步长为3. 但是增加机器的时候需要重新分配ID麻烦
#### 2.3.1. 问题
不满足高可用的要求，完全依赖Redis


### 2.4. snowflakeId

#### 2.4.1. 原理
![](https://raw.githubusercontent.com/TDoct/images/master/1592724779_20200621153250323_3894.png)
通过时间戳保证ID的唯一性

#### 2.4.2. 实现

```java

package com.zsk.template.util;

import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.net.NetworkInterface;

/**
 * Twitter_Snowflake ID生成器
 * 
 * Twitter_Snowflake<br>
 * SnowFlake的结构如下(每部分用-分开):<br>
 * 0 - 0000000000 0000000000 0000000000 0000000000 0 - 00000 - 00000 - 000000000000 <br>
 * 1位标识，由于long基本类型在Java中是带符号的，最高位是符号位，正数是0，负数是1，所以id一般是正数，最高位是0<br>
 * 41位时间截(毫秒级)，注意，41位时间截不是存储当前时间的时间截，而是存储时间截的差值（当前时间截 - 开始时间截)
 * 得到的值），这里的的开始时间截，一般是我们的id生成器开始使用的时间，由我们程序来指定的（如下下面程序IdWorker类的startTime属性）。
 * 41位的时间截，可以使用69年，年T = (1L << 41) / (1000L * 60 * 60 * 24 * 365) = 69<br>
 * 10位的数据机器位，可以部署在1024个节点，包括5位datacenterId和5位workerId<br>
 * 12位序列，毫秒内的计数，12位的计数顺序号支持每个节点每毫秒(同一机器，同一时间截)产生4096个ID序号<br>
 * 加起来刚好64位，为一个Long型。<br>
 * SnowFlake的优点是，整体上按照时间自增排序，并且整个分布式系统内不会产生ID碰撞(由数据中心ID和机器ID作区分)，并且效率较高，经测试，SnowFlake每秒能够产生26万ID左右。
 */
//@Component
public class SnowflakeId {
    
    private static final Logger logger  = LoggerFactory.getLogger(SnowflakeId.class);

	// ==============================Fields===========================================
	/** 开始时间截 (2015-01-01) */
	private final long twepoch = 1420041600000L;

	/** 机器id所占的位数 */
	private final long workerIdBits = 5L;

	/** 数据标识id所占的位数 */
	private final long datacenterIdBits = 5L;

	/** 支持的最大机器id，结果是31 (这个移位算法可以很快的计算出几位二进制数所能表示的最大十进制数) */
	private final long maxWorkerId = -1L ^ (-1L << workerIdBits);

	/** 支持的最大数据标识id，结果是31 */
	private final long maxDatacenterId = -1L ^ (-1L << datacenterIdBits);

	/** 序列在id中占的位数 */
	private final long sequenceBits = 12L;

	/** 机器ID向左移12位 */
	private final long workerIdShift = sequenceBits;

	/** 数据标识id向左移17位(12+5) */
	private final long datacenterIdShift = sequenceBits + workerIdBits;

	/** 时间截向左移22位(5+5+12) */
	private final long timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;

	/** 生成序列的掩码，这里为4095 (0b111111111111=0xfff=4095) */
	private final long sequenceMask = -1L ^ (-1L << sequenceBits);

	/** 工作机器ID(0~31) */
	private long workerId;

	/** 数据中心ID(0~31) */
	private long datacenterId;

	/** 毫秒内序列(0~4095) */
	private long sequence = 0L;

	/** 上次生成ID的时间截 */
	private long lastTimestamp = -1L;

	// ==============================Constructors=====================================
	
	public SnowflakeId() {
        this.datacenterId = getDatacenterId(maxDatacenterId);
        this.workerId = getMaxWorkerId(datacenterId, maxWorkerId);
	}
	
	/**
	 * 构造函数
	 * @param workerId 工作ID (0~31)
	 * @param datacenterId 数据中心ID (0~31)
	 */
	public SnowflakeId(long workerId, long datacenterId) {
		if (workerId > maxWorkerId || workerId < 0) {
			throw new IllegalArgumentException(
					String.format("worker EsId can't be greater than %d or less than 0", maxWorkerId));
		}
		if (datacenterId > maxDatacenterId || datacenterId < 0) {
			throw new IllegalArgumentException(
					String.format("datacenter EsId can't be greater than %d or less than 0", maxDatacenterId));
		}
		this.workerId = workerId;
		this.datacenterId = datacenterId;
		logger.debug("SnowflakeId: datacenterId:[{}], workerId:[{}]", datacenterId, workerId);
	}

	// ==============================Methods==========================================
	/**
	 * 获得下一个ID (该方法是线程安全的)
	 * @return SnowflakeId
	 */
	public synchronized long nextId() {
		long timestamp = timeGen();

		// 如果当前时间小于上一次ID生成的时间戳，说明系统时钟回退过这个时候应当抛出异常
		if (timestamp < lastTimestamp) {
			throw new RuntimeException(String.format(
					"Clock moved backwards.  Refusing to generate id for %d milliseconds", lastTimestamp - timestamp));
		}
		
    //这句改成下面的则可能导致全都是偶数。参考：https://blog.csdn.net/wangzhanzheng/article/details/84937021
    //		sequence = (sequence + 1) & sequenceMask;

		
		// 如果是同一时间生成的，则进行毫秒内序列
		if (lastTimestamp == timestamp) {
		    //使用位运算判断是否>4095，即判断是否溢出
			sequence = (sequence + 1) & sequenceMask;
			// 毫秒内序列溢出
			if (sequence == 0) {
				// 阻塞到下一个毫秒,获得新的时间戳
				timestamp = tilNextMillis(lastTimestamp);
			}
		} else {
			// 时间戳改变，毫秒内序列重置
			sequence = 0L;
		}

		// 上次生成ID的时间截
		lastTimestamp = timestamp;

		// 移位并通过或运算拼到一起组成64位的ID
		return ((timestamp - twepoch) << timestampLeftShift) //时间戳部分。注意twepoch绝对不能修改
				| (datacenterId << datacenterIdShift) //数据中心
				| (workerId << workerIdShift) //机器
				| sequence;//毫秒内序列号
	}
	
    /**
     * <p>
     * 数据标识id部分
     * </p>
     */
    protected static long getDatacenterId(long maxDatacenterId) {
        long id = 0L;
        try {
            InetAddress ip = InetAddress.getLocalHost();
            NetworkInterface network = NetworkInterface.getByInetAddress(ip);
            if (network == null) {
                id = 1L;
            } else {
                byte[] mac = network.getHardwareAddress();
                if (null != mac) {
                    id = ((0x000000FF & (long) mac[mac.length - 1]) | (0x0000FF00 & (((long) mac[mac.length - 2]) << 8))) >> 6;
                    id = id % (maxDatacenterId + 1);
                }
            }
        } catch (Exception e) {
            logger.warn(" getDatacenterId: " + e.getMessage());
        }
        return id;
    }
    
    /**
     * <p>
     * 获取 maxWorkerId
     * </p>
     */
    protected static long getMaxWorkerId(long datacenterId, long maxWorkerId) {
        StringBuilder mpid = new StringBuilder();
        mpid.append(datacenterId);
        String name = ManagementFactory.getRuntimeMXBean().getName();
        if (StringUtils.isNotEmpty(name)) {
            /*
             * GET jvmPid
             */
            mpid.append(name.split("@")[0]);
        }
        /*
         * MAC + PID 的 hashcode 获取16个低位
         */
        return (mpid.toString().hashCode() & 0xffff) % (maxWorkerId + 1);
    }

	/**
	 * 阻塞到下一个毫秒，直到获得新的时间戳
	 * @param lastTimestamp 上次生成ID的时间截
	 * @return 当前时间戳
	 */
	protected long tilNextMillis(long lastTimestamp) {
		long timestamp = timeGen();
		while (timestamp <= lastTimestamp) {
			timestamp = timeGen();
		}
		return timestamp;
	}

	/**
	 * 返回以毫秒为单位的当前时间
	 * @return 当前时间(毫秒)
	 */
	protected long timeGen() {
		return System.currentTimeMillis();
	}

}


```
#### 2.4.3. 部署
##### 2.4.3.1. 集群模式
##### 2.4.3.2. 集群模式怎么管理datacenterid和workerid
zookeeper或者配置文件
#### 2.4.4. 问题
##### 2.4.4.1. 时钟回拨
不满足高可用，毕竟时钟回拨直接抛出异常

###### 2.4.4.1.1. 解决
1. 集群模式下首先部署一台ntp时间同步服务器, 然后所有节点跟这台服务器同步全局时钟
2. 设置最大的容忍时间，回拨了sleep一会重试(其实也就10ms左右)
3. 冗余策略
    - 机器位有10bit，可以分成两个批次.第一批次是0-512,第二批次512-1023.如果0号机时钟回拨了,那么可以降级调用512号机


#### 2.4.5. 例子
##### 2.4.5.1. 美团leaf
[Leaf/README\_CN\.md at master · Meituan\-Dianping/Leaf · GitHub](https://github.com/Meituan-Dianping/Leaf/blob/master/README_CN.md)
[Leaf：美团分布式ID生成服务开源 \- 美团技术团队](https://tech.meituan.com/2019/03/07/open-source-project-leaf.html)
##### 2.4.5.2. 百度uid-generator
[百度开源的分布式 ID 生成器，太强大了！ \- SegmentFault 思否](https://segmentfault.com/a/1190000040130918)
[GitHub \- baidu/uid\-generator: UniqueID generator](https://github.com/baidu/uid-generator)
## 3. 参考
- [如果再有人问你分布式 ID，这篇文章丢给他](https://juejin.im/post/5bb0217ef265da0ac2567b42)
- [分布式唯一ID的几种生成方案](https://juejin.im/post/5b3a23746fb9a024e15cad79)
- [服务器时钟回拨的具体概念是什么？ \- 知乎](https://www.zhihu.com/question/313992617)
- [UUID是如何保证唯一性的？ \- 知乎](https://www.zhihu.com/question/34876910)
- [分布式SnowFlakeID（雪花ID）原理和改进优化 \- 知乎](https://zhuanlan.zhihu.com/p/364764903)
- [脉脉-时钟回拨](https://maimai.cn/web/gossip_detail?gid=29639564&egid=6f6be7754daa11ec87e1801844e50190)