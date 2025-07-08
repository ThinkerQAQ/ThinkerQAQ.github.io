[toc]


## 1. 为什么会发生OOM
得从GC回收过程说起（参考[垃圾回收.md](../../垃圾回收/垃圾回收.md)），可以看出GC之回收GCRoot达不到的对象的，GCRoot引用的对象是强引用，是没办法被回收的。
如果jvm内存中都是强引用对象，那么FullGC后jvm内存剩余空间很有可能不足以存放将要创建的新的对象，就会发生OOM

### 1.1. OOM的可能原因
#### 1.1.1. 代码问题【50%】
根据不同的分区进行分析:

- 非堆内存
    - 堆外内存【直接内存】
    - 文件
    - socket
    - 数据库连接
- 方法区
- 堆

#### 1.1.2. jvm参数配置问题【40%】

[JVM参数调优.md](../jvm参数/JVM参数调优.md)

#### 1.1.3. 是机器内存不够【10%】

升级硬件

## 2. 如何分析OOM


### 2.1. OutOfMemoryError【堆】

#### 2.1.1. 代码

```java
public class OOMTest
{
    //jvm参数：-Xmx128m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=C:\Users\zsk\Downloads
    public static void main(String[] args)
    {
        Map<Integer, byte[]> map = new HashMap();
        for (int i = 0; i < 128; i++)
        {
            byte[] bytes = new byte[1024 * 1024];//1m
            map.put(i, bytes);
        }
    }
}
```


#### 2.1.2. 获取内存Dump文件



- 加上jvm参数
```java
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=./
```

- 使用jmap

```java
jps -l //获取PID
jmap -dump:format=b,file=OOMTest.hprof PID

```


#### 2.1.3. 使用MAT/JProfiler分析

##### 2.1.3.1. MAT找到占用最大的空间的对象即可
- 整体功能
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200317211837.png)
- 按照对象数量查看
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200317211853.png)
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200317211908.png)
- 按照对象内存占用查看
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200317211950.png)
- MAT自动分析
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200317212018.png)


##### 2.1.3.2. JProfiler找到占用最大的空间的对象即可
- 按照字节占用排序
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200317212125.png)
- 分析最大的对象
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200317212144.png)
- 查看什么对象引用了这个对象
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318100339.png)
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318100427.png)
- 找到GCRoot
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200317212219.png)


### 2.2. Metaspace【方法区】


#### 2.2.1. 代码

```java
//jvm参数：-XX:MetaspaceSize=20m -XX:MaxMetaspaceSize=20m -XX:+PrintGCDetails -XX:+PrintGCDateStamps -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=C:\Users\zsk\Downloads
public class OOMMetaspace
{
    static class OOMTest
    {
    }

    public static void metaOOM()
    {
        while (true)
        {
            Enhancer enhancer = new Enhancer();
            enhancer.setSuperclass(OOMTest.class);
            enhancer.setUseCache(false);
            enhancer.setCallback(new MethodInterceptor()
            {
                @Override
                public Object intercept(Object o, Method method, Object[] objects, MethodProxy methodProxy) throws Throwable
                {
                    return methodProxy.invokeSuper(o, null);
                }
            });
            enhancer.create();
        }
    }

    public static void main(String[] args)
    {
        metaOOM();
    }
}
```

#### 2.2.2. 获取内存Dump文件



- 加上jvm参数
```java
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=./
```

- 使用jmap

```java
jps -l //获取PID
jmap -dump:format=b,file=OOMTest.hprof PID

```

#### 2.2.3. 使用MAT/JProfiler分析

##### 2.2.3.1. MAT
- 搜索Class
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318094900.png)
- 查看哪些引用了Class
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318095010.png)
- 找到最多的引用
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318095056.png)

##### 2.2.3.2. JProfiler
- 按照ClassLoader分组
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318095151.png)

- 查看谁引用了Class
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318095226.png)
- 分析其中一个
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318095347.png)
- 查看哪个GCRoot引用了他
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318095410.png)
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318095435.png)
- 找到了GCRoot之后分析代码
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200318095322.png)

### 2.3. 堆外内存
[一次堆外内存泄露的排查过程\-云栖社区\-阿里云](https://yq.aliyun.com/articles/657160)

## 3. 其他OOM举例

### 3.1. StackOverflowError【栈】

递归没有设置正确的终止条件

```java
public class OOMStackOverFlow
{
    public static void stackOverflowError()
    {
        stackOverflowError();
    }

    public static void main(String[] args)
    {
        stackOverflowError();
    }
}
```





### 3.2. GC overhead limit exceeded【GC次数太多但是效率低】

分配的内存不够用，就是用大量的时间用于GC但是回收的效率很低。官方定义超过98%的时间用来做GC并且回收了不到2%的堆内存时会抛出此异常。

```java
//-Xms10m -Xmx10m -XX:MaxDirectMemorySize=5m -XX:+PrintGCDetails -XX:+PrintGCDateStamps
public class OOMGCOverHeadLimit
{
    public static void gcOverhead()
    {
        int i = 0;
        List<String> list = new ArrayList<>();

        try
        {
            while (true)
            {
                list.add(String.valueOf(i++).intern());
            }
        }catch (Throwable e)
        {
            e.printStackTrace();
        }
    }

    public static void main(String[] args)
    {
        gcOverhead();
    }
}

```

### 3.3. Direct buffer memory【直接内存】

```java
//-Xms10m -Xmx10m -XX:+PrintGCDetails -XX:MaxDirectMemorySize=5m -XX:+PrintGCDateStamps
public class OOMDirectBuffer
{
    public static void directBuffer()
    {
        ByteBuffer byteBuffer = ByteBuffer.allocateDirect(1024 * 1024 * 100);
    }

    public static void main(String[] args)
    {
        directBuffer();
    }
}

```


### 3.4. unable to create new native thread【线程】

```java
public class OOMThreadTooMuch
{
    public static void thredTooMuch()
    {
        while (true)
        {
            new Thread(()->{
                try
                {
                    TimeUnit.SECONDS.sleep(Integer.MAX_VALUE);
                }
                catch (InterruptedException e)
                {
                    e.printStackTrace();
                }
            }).start();
        }
    }

    public static void main(String[] args)
    {
        thredTooMuch();
    }
}
```



