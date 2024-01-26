

[toc]


## 1. 是什么
Unsafe类顾名思义是个不安全的类，为什么说他不安全呢？我们得从C语言的内存管理说起。
### 1.1. C语言的内存管理
C语言中每个变量在内存中都有一个地址，我们可以用`&变量名`获取这个地址，然后用指针变量进行接收。说白了指针保存的就是内存地址。
我们要使用一段内存的时候需要用`malloc`函数分配，并用指针保存这段内存起始的内存地址，使用完毕后用`free`函数释放掉，这就是C语言的手动内存管理，灵活但是不安全。不安全的原因在于如果使用往后没有释放掉，那么这段内存就会一直被占用无法释放，最后内存就会被耗尽--即内存泄漏。
### 1.2. Java的内存管理
Java语言中使用的是自动内存管理机制。他把内存主要分为栈和堆两部分，当堆空间满的时候会触发GC，回收不使用的内存空间。因此编写Java程序的时候我们不需要考虑手动释放内存，GC会为我们处理一切。
### 1.3. 说回Unsafe
Java中没有指针的概念，只有一个类似的概念叫引用类型，不过我们是无法直接修改引用类型的地址的，可是我们有时候确实有这样的需求咋办？
为了解决这个问题，Java引入了一个Unsafe类，使用这个类我们就可以操作内存地址了O(∩_∩)O

## 2. 如何使用
### 2.1. 实例化
首先得获取Unsafe类实例，但是这个类是无法直接new的，如下图：
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200114143434.png)    
点进Unsafe类中查看源码：
```java
public final class Unsafe {
    private static final Unsafe theUnsafe;
    static {
        //...
        theUnsafe = new Unsafe();
        //..
    }
    
    public static Unsafe getUnsafe() {
        Class var0 = Reflection.getCallerClass();
        if (!VM.isSystemDomainLoader(var0.getClassLoader())) {
            throw new SecurityException("Unsafe");
        } else {
            return theUnsafe;
        }
    }
```
发现有一个theUnsafe属性，并且static块中已经为其赋值为`new Unsafe()`，那我们可以尝试他的static方法getUnsafe：
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200114144428.png)
发现会抛出异常，那咋办，还有其他方法可以获取theUnsafe属性么--可以用反射
```java
public class UnsafeTest
{
    public static void main(String[] args) throws NoSuchFieldException, IllegalAccessException
    {
        //使用反射theUnsafe中的Unsafe实例
        Field field = Unsafe.class.getDeclaredField("theUnsafe");
        field.setAccessible(true);
        Unsafe unsafe = (Unsafe) field.get(null);
        System.out.println(unsafe.toString());//sun.misc.Unsafe@3e3abc88
    }
}
```

### 2.2. 获取某个属性的内存地址
```java
public class UnsafeTest
{
    private int value;

    public static void main(String[] args) throws NoSuchFieldException, IllegalAccessException
    {
        //使用反射theUnsafe中的Unsafe实例
        Field field = Unsafe.class.getDeclaredField("theUnsafe");
        field.setAccessible(true);
        Unsafe unsafe = (Unsafe) field.get(null);

        Field intValueField = UnsafeTest.class.getDeclaredField("value");
        intValueField.setAccessible(true);
        //使用unsafe获取field的内存地址
        long offset = unsafe.objectFieldOffset(intValueField);
        System.out.println(offset);//12
    }
}
```
### 2.3. 获取内存地址对应的变量值
```java
public class UnsafeTest
{
    private int value = 100;

    public static void main(String[] args) throws NoSuchFieldException, IllegalAccessException
    {
        new UnsafeTest().test();
    }

    private void test() throws NoSuchFieldException, IllegalAccessException
    {
        //使用反射theUnsafe中的Unsafe实例
        Field field = Unsafe.class.getDeclaredField("theUnsafe");
        field.setAccessible(true);
        Unsafe unsafe = (Unsafe) field.get(null);

        Field intValueField = UnsafeTest.class.getDeclaredField("value");
        intValueField.setAccessible(true);
        long offset = unsafe.objectFieldOffset(intValueField);
        
        System.out.println(unsafe.getInt(this, offset));//100
    }
}
```

### 2.4. 原子更新内存地址对应的变量值
```java
public class UnsafeTest
{
    private int value = 100;

    public static void main(String[] args) throws NoSuchFieldException, IllegalAccessException
    {
        new UnsafeTest().test();
    }

    private void test() throws NoSuchFieldException, IllegalAccessException
    {
        //使用反射theUnsafe中的Unsafe实例
        Field field = Unsafe.class.getDeclaredField("theUnsafe");
        field.setAccessible(true);
        Unsafe unsafe = (Unsafe) field.get(null);

        Field intValueField = UnsafeTest.class.getDeclaredField("value");
        intValueField.setAccessible(true);
        long offset = unsafe.objectFieldOffset(intValueField);

        unsafe.compareAndSwapInt(this, offset, value, 300);
        System.out.println(unsafe.getInt(this, offset));//300
    }
}
```

### 2.5. 原子增加内存地址对应的变量值
```java
public class UnsafeTest
{
    private int value = 100;

    public static void main(String[] args) throws NoSuchFieldException, IllegalAccessException
    {
        new UnsafeTest().test();
    }

    private void test() throws NoSuchFieldException, IllegalAccessException
    {
        //使用反射theUnsafe中的Unsafe实例
        Field field = Unsafe.class.getDeclaredField("theUnsafe");
        field.setAccessible(true);
        Unsafe unsafe = (Unsafe) field.get(null);

        Field intValueField = UnsafeTest.class.getDeclaredField("value");
        intValueField.setAccessible(true);
        long offset = unsafe.objectFieldOffset(intValueField);

        System.out.println(unsafe.getAndAddInt(this, offset,200));//返回的更新前的值100
        System.out.println(unsafe.getInt(this, offset));//300

    }
}
```
## 3. 参考
- [Unsafe类的介绍和使用 \- 掘金](https://juejin.im/post/5c975bd26fb9a071090d6a83)