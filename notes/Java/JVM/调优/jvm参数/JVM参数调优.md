[toc]
 



## 1. 调整哪些参数
1. 针对JVM堆的设置，一般可以通过-Xms -Xmx限定其最小、最大值，为了防止垃圾收集器在最小、最大之间收缩堆而产生额外的时间，通常把最大、最小设置为相同的值;

2. 年轻代和年老代将根据默认的比例（1：2）分配堆内存， 可以通过调整二者之间的比率NewRadio来调整二者之间的大小；也可以针对回收代具体设置，比如年轻代，通过 -XX:newSize -XX:MaxNewSize来设置其绝对大小。同样，为了防止年轻代的堆收缩，我们通常会把-XX:newSize -XX:MaxNewSize设置为同样大小。

3. 年轻代和年老代设置多大才算合理
    - 更大的年轻代必然导致更小的年老代，大的年轻代会延长普通GC的周期，但会增加每次GC的时间；小的年老代会导致更频繁的Full GC
    - 更小的年轻代必然导致更大年老代，小的年轻代会导致普通GC很频繁，但每次的GC时间会更短；大的年老代会减少Full GC的频率

如何选择应该依赖应用程序对象生命周期的分布情况： 如果应用存在大量的临时对象，应该选择更大的年轻代；如果存在相对较多的持久对象，年老代应该适当增大。但很多应用都没有这样明显的特性。

在抉择时应该根 据以下两点：

- 本着Full GC尽量少的原则，让年老代尽量缓存常用对象，JVM的默认比例1：2也是这个道理 。
- 通过观察应用一段时间，看其他在峰值时年老代会占多少内存，在不影响Full GC的前提下，根据实际情况加大年轻代，比如可以把比例控制在1：1。但应该给年老代至少预留1/3的增长空间。

4. 在配置较好的机器上（比如多核、大内存），可以为年老代选择并行收集算法： -XX:+UseParallelOldGC 。

5. 线程堆栈的设置：每个线程默认会开启1M的堆栈，用于存放栈帧、调用参数、局部变量等，对大多数应用而言这个默认值太了，一般256K就足用。理论上，在内存不变的情况下，减少每个线程的堆栈，可以产生更多的线程，但这实际上还受限于操作系统。

## 2. JVM参数类型


### 2.1. 标配参数

### 2.2. X参数
-Xms 等价于-XX:InitialHeapSize
-Xmx等价于-XX:MaxHeapSize

### 2.3. XX参数（重点）

#### 2.3.1. 布尔型
-XX:+/-某参数

#### 2.3.2. KV型
-XX:属性key=属性值value


## 3. 如何查看JVM参数


### 3.1. 查看某个进程的参数

#### 3.1.1. 查看某个参数是否打开
- 首先用`jps -l`查看进程号
- 然后用`jinfo -flag PrintGCDetails PID`查看参数状态
- 最后结果
```
-XX:-PrintGCDetails表示未开启
```

#### 3.1.2. 查看某个进程的当前JVM参数
```
jinfo -flags PID
```

### 3.2. 查看默认值

- `java -XX:+PrintCommandLineFlags -version` 运行前打印出用户手动设置或者JVM自动设置的XX选项

- `java -XX:+PrintFlagsInitial` 打印出所有XX选项的默认值

- `java -XX:+PrintFlagsFinal` 打印出XX选项在运行程序时生效的值


结果中有:=的是被修改过的参数，只有=号的是没有被修改过的参数


## 4. JVM常用参数


### 4.1. -Xms
堆初始内存大小，默认为物理内存的1/64
等价于-XX:InitialHeapSize

### 4.2. -Xmx
堆最大内存大小，默认为物理内存的1/4
等价于-XX:MaxHeapSize

### 4.3. -Xss
设置单个线程栈的大小，一般为512k-1024k
等价于-XX:ThreadStackSize

### 4.4. -Xmn
设置堆中的年轻代大小

### 4.5. -XX:PermSize
设置永久代大小
### 4.6. -XX:MaxPermSize
设置永久代最大大小
### 4.7. -XX:MetaspaceSize
当方法区达到这个容量时触发FullGC，不是设置元空间大小

### 4.8. -XX:MaxMetaspaceSize
设置元空间最大大小

### 4.9. -XX:+PrintGCDetaills

打印GC日志

### 4.10. -XX:+PrintGCDateStamps
打印GC的时候使用时间戳格式

#### 4.10.1. 举例
- HelleGc
```java
public class HelloGc
{
    public static void main(String[] args) throws InterruptedException
    {
        byte[] bytes = new byte[1024 * 1024 * 50];
        TimeUnit.SECONDS.sleep(Integer.MAX_VALUE);
    }
}
```

- JVM参数
```
-Xms10m -Xmx10m -XX:+PrintGCDetails
```

- 结果
```
[GC (Allocation Failure) [PSYoungGen: 1322K->464K(2560K)] 1322K->472K(9728K), 0.0054838 secs] [Times: user=0.00 sys=0.00, real=0.01 secs] 
[GC (Allocation Failure) [PSYoungGen: 464K->400K(2560K)] 472K->408K(9728K), 0.0054238 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] 
[Full GC (Allocation Failure) [PSYoungGen: 400K->0K(2560K)] [ParOldGen: 8K->369K(7168K)] 408K->369K(9728K), [Metaspace: 2965K->2965K(1056768K)], 0.0310888 secs] [Times: user=0.06 sys=0.00, real=0.03 secs] 
[GC (Allocation Failure) [PSYoungGen: 0K->0K(2560K)] 369K->369K(9728K), 0.0016863 secs] [Times: user=0.01 sys=0.00, real=0.01 secs] 
[Full GC (Allocation Failure) [PSYoungGen: 0K->0K(2560K)] [ParOldGen: 369K->350K(7168K)] 369K->350K(9728K), [Metaspace: 2965K->2965K(1056768K)], 0.0212330 secs] [Times: user=0.04 sys=0.00, real=0.02 secs] 
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at com.zsk.context.gc.HelloGc.main(HelloGc.java:14)
Heap
 PSYoungGen      total 2560K, used 152K [0x00000000ffd00000, 0x0000000100000000, 0x0000000100000000)
  eden space 2048K, 7% used [0x00000000ffd00000,0x00000000ffd26240,0x00000000fff00000)
  from space 512K, 0% used [0x00000000fff00000,0x00000000fff00000,0x00000000fff80000)
  to   space 512K, 0% used [0x00000000fff80000,0x00000000fff80000,0x0000000100000000)
 ParOldGen       total 7168K, used 350K [0x00000000ff600000, 0x00000000ffd00000, 0x00000000ffd00000)
  object space 7168K, 4% used [0x00000000ff600000,0x00000000ff657b08,0x00000000ffd00000)
 Metaspace       used 3052K, capacity 4496K, committed 4864K, reserved 1056768K
  class space    used 327K, capacity 388K, committed 512K, reserved 1048576K
```

- 解释
[GC日志分析.md](GC日志分析.md)

### 4.11. -XX:SurvivorRatio
设置年轻代中伊甸园与幸存区的比例
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200130134148.png)
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200130134415.png)
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200130134317.png)

### 4.12. -XX:NewRatio
设置年轻代与老年代的比例
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200130134207.png)
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200130134436.png)
### 4.13. -XX:MaxTenuringThreshold
设置垃圾从年轻代进入老年代的年龄

## 5. 典型案例设置


### 5.1. 修改之前

```
-XX:+PrintCommandLineFlags
```

打印出来的值
```
-XX:InitialHeapSize=128699840 
-XX:MaxHeapSize=2059197440 
-XX:+PrintCommandLineFlags 
-XX:+UseCompressedClassPointers 
-XX:+UseCompressedOops 
-XX:+UseParallelGC
```


### 5.2. 修改之后
```
-Xms128m -Xmx4096m -Xss1024k -XX:MetaspaceSize=512m -XX:+PrintCommandLineFlags -XX:+PrintGCDetails -XX:+UseSerialGC
```

打印出来的值
```
-XX:InitialHeapSize=134217728 
-XX:MaxHeapSize=4294967296 
-XX:MetaspaceSize=536870912 
-XX:+PrintCommandLineFlags 
-XX:+PrintGCDetails 
-XX:ThreadStackSize=1024 
-XX:+UseCompressedClassPointers 
-XX:+UseCompressedOops 
-XX:+UseSerialGC
```



## 6. 参考
- [JVM参数MetaspaceSize的误解 \- 简书](https://www.jianshu.com/p/b448c21d2e71)
