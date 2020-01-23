[toc]

 

## 1. 是什么

不可变、线程安全的字符串


## 2. 使用

```java
public class StringTest
{
    public static void main(String[] args)
    {
        String val = new String("test1");
        String val1 = new String("test1");
        System.out.println(val == val1);//false。上面的代码会在堆中两块不同的地方创建字符串

        String val2 = "test2";
        String val3 = "test2";
        System.out.println(val2 == val3);//true。上面的代码在编译期间已经确定，那么会把"test2"保存在常量池（不是堆中）

        String val4 = "te" + "st2";
        System.out.println(val2 == val4);//true。虽然val4是通过+拼接的，但是这个也是可以在编译期确定的，所以使用的仍是常量池中的字符串

        String val5 = String.valueOf("test3");
        String val6 = String.valueOf("test3");
        System.out.println(val5 == val6);//true。"test3"在编译期间已经确定，放入常量池中。String.valueOf返回的是常量池中的字符串


        String aa = new String("1111");
        String bb = new String("1111");
        String val9 = String.valueOf(aa);
        String val10 = String.valueOf(bb);
        System.out.println(val9 == val10);//false。两个"1111"分别在堆中创建，String.valueOf返回的是堆中不同的对象

        String val7 = new String("test4");
        String val8 = "test4";
        String val7Intern = val7.intern();
        System.out.println(val8 == val7);//false。val7在堆中，val8在常量池中，自然不相等
        System.out.println(val8 == val7Intern);//true。intern方法的作用是在运行时往常量池中增加字符串，如果常量池池中已有，那么把常量池中的对象返回
        System.out.println(val8 == val7);//false。再试验一次说明intern方法不是把堆中的地址塞到常量池中
    }
}
```

## 3. 源码分析


### 3.1. 类的定义
```java
//final表示不能被继承 
public final class String
	//可比较，可序列化
    implements java.io.Serializable, Comparable<String>, CharSequence 
{
    /** The value is used for character storage. */
    //底层是通过char数组实现的，final表示引用不能修改，但并不表示char数组里的值不能修改
    //那为什么String还是不可变的呢？因为String并没有提供修改value数组值的方法，所以自然就不可变
    private final char value[];

    /** Cache the hash code for the string */
    private int hash; // Default to 0
}
```
String是不可变的
- 类使用final修饰
- 内部属性char value[]使用final修饰，说明引用不能改变
- 且内部没有对外提供修改内部属性char value[]的方法


### 3.2. 构造方法
```java
//无参构造方法
public String() {
	//会创建一个空串
    this.value = "".value;
}

//使用String构造
public String(String original) {
	//直接把引用指向同一个字符数组？因为String内部的char数组是不可以改变的，所以可以共享
    this.value = original.value;
    this.hash = original.hash;
}

//使用char数组构造
public String(char value[]) {
	//外部传递过来的char数组可能被改变，所有需要复制数组
    this.value = Arrays.copyOf(value, value.length);
}

//使用StringBuffer构造
public String(StringBuffer buffer) {
	//线程安全的StringBUffer需要加锁并且复制数组
    synchronized(buffer) {
        this.value = Arrays.copyOf(buffer.getValue(), buffer.length());
    }
}
//使用StringBuilde构造
public String(StringBuilder builder) {
	//复制数组
    this.value = Arrays.copyOf(builder.getValue(), builder.length());
}

//使用char数组带下标的构造
public String(char value[], int offset, int count) {
    if (offset < 0) {
        throw new StringIndexOutOfBoundsException(offset);
    }
    if (count <= 0) {
        if (count < 0) {
            throw new StringIndexOutOfBoundsException(count);
        }
        if (offset <= value.length) {
            this.value = "".value;
            return;
        }
    }
    // Note: offset or count might be near 1>>>1.
    if (offset > value.length  count) {
        throw new StringIndexOutOfBoundsException(offset + count);
    }

    //复制char数组
    this.value = Arrays.copyOfRange(value, offset, offset+count);
}
```
#### 3.2.1. 解释new String("test1") != new String("test1")
```java
 String val = new String("test1");
String val1 = new String("test1");
System.out.println(val == val1);//false。上面的代码会在堆中两块不同的地方创建字符串
```
我们查看字节码，结果如下：
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200119171523.png)
调用的字节码时NEW，会在堆中创建字符串，所以两者不同

### 3.3. 常量池
英文名叫constant pool，指的是在编译期被确定，并被保存在已编译的.class文件中的一些数据。它包括了关于类、方法、接口等中的常量，也包括字符串常量

#### 3.3.1. 解释"test2"=="test2"
```java
String val2 = "test2";
String val3 = "test2";
System.out.println(val2 == val3);//true。上面的代码在编译期间已经确定，那么会把"test2"保存在常量池（不是堆中）

String val4 = "te" + "st2";
System.out.println(val2 == val4);//true。虽然val4是通过+拼接的，但是这个也是可以在编译期确定的，所以使用的仍是常量池中的字符串
```
我们查看字节码，结果如下：
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200119172725.png)
可以看出上面三行都调用了`LDC`字节码，他表示在常量池中加载字符串，而`"test2"`这个字符串在编译器会存入.class文件中，因此三者相等

### 3.4. equals方法
```java
public boolean equals(Object anObject) {
	//首先比较引用是否相等
    if (this == anObject) {
        return true;
    }
    //如果是个字符串
    if (anObject instanceof String) {
        String anotherString = (String)anObject;
        int n = value.length;
    	//字符数组长度相等
        if (n == anotherString.value.length) {
            char v1[] = value;
            char v2[] = anotherString.value;
            int i = 0;
        	//从后往前比较value是否相等
            while (n != 0) {
                if (v1[i] != v2[i])
                    return false;
                i++;
            }
            return true;
        }
    }
    return false;
}

```

### 3.5. toCharArray方法
```java
public char[] toCharArray() {
    // Cannot use Arrays.copyOf because of class initialization order issues
    //创建一个新的char数组
    char result[] = new char[value.length];
    //调用arraycopy函数把value的值复制到新的char数组返回(防止外界改变char数组的值)
    System.arraycopy(value, 0, result, 0, value.length);
    return result;
}

```


### 3.6. toString
```java
public String toString() {
	//直接返回自己
    return this;
}
```


### 3.7. valueOf
```java
public static String valueOf(Object obj) {
	//为null的话返回“null”，否则调用obj的toString
    return (obj == null) ? "null" : obj.toString();
}
```

#### 3.7.1. 解释String.valueOf("test3") == String.valueOf("test3")
```java
String val5 = String.valueOf("test3");
String val6 = String.valueOf("test3");
System.out.println(val5 == val6);//true。"test3"在编译期间已经确定，放入常量池中。String.valueOf返回的是常量池中的字符串
```
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200122153151.png)
对于`String val5 = String.valueOf("test3")`这种代码，编译器首先会把他当作`String val5 = "test3"`处理，把`"test3"`放入常量池中，然后调用`String.valueOf`方法返回常量池中的`"test3"`字符串，所以两者相等。

- 再看一个例子

```java
String aa = new String("1111");
String bb = new String("1111");
String val9 = String.valueOf(aa);
String val10 = String.valueOf(bb);
System.out.println(val9 == val10);//false。两个"1111"分别在堆中创建，String.valueOf返回的是堆中不同的对象
```
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200122154245.png)
`String aa = new String("1111")`这种先在堆中创建字符串`"1111"`，然后`String val9 = String.valueOf(aa)`返回的是堆中的字符串，所以两者不等
### 3.8. intern方法
```java
//调用intern方法的时候，如果常量池中已经存在一个字符串与这个字符串相等，那么返回常量池的中字符串。
//没有的话会在常量池中创建这个字符串，然后才返回。
public native String intern();

```

#### 解释new String("test4").intern() == "test4"
```java
String val7 = new String("test4");
String val8 = "test4";
String val7Intern = val7.intern();
System.out.println(val8 == val7);//false。val7在堆中，val8在常量池中，自然不相等
System.out.println(val8 == val7Intern);//true。intern方法的作用是在运行时往常量池中增加字符串，如果常量池池中已有，那么把常量池中的对象返回
System.out.println(val8 == val7);//false。再试验一次说明intern方法不是把堆中的地址塞到常量池中
```
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200122155314.png)
`String val7 = new String("test4")`是堆中的字符串`"test4"`，`String val8 = "test4"`是常量池中的`"test4"`，`String val7Intern = val7.intern()`intern首先检查常量池中是否有`"test4"`，发现有直接返回

### 3.9. subString
```java
String substring(int beginIndex, int endIndex) {
	//下标越界判断
    if (beginIndex < 0) {
        throw new StringIndexOutOfBoundsException(beginIndex);
    }
    if (endIndex > value.length) {
        throw new StringIndexOutOfBoundsException(endIndex);
    }
    int subLen = endIndex  beginIndex;
    if (subLen < 0) {
        throw new StringIndexOutOfBoundsException(subLen);
    }
    //返回自己或者调用使用char数组带下标的构造函数
    return ((beginIndex == 0) && (endIndex == value.length)) ? this
            : new String(value, beginIndex, subLen);
}
```


## 4. 常见问题


### 4.1. toString和valueOf的区别
```java
String aa = null;
//System.out.println(aa.toString());//抛出异常
System.out.println(String.valueOf(aa));//null
```
前者没有做为空判断，后者做了。

### 4.2. String的不可变性
 String这个类是由final修饰的，意味着不能被继承
 String内部通过char数组实现，而这个数组是用final修饰的。意味着一旦赋值就不能改变引用，而且String也没有提供修改字符数组内容的方法
用下面的例子解释：
```java
String a = "aaa";
a = "bbb";//这里的可变String类型的引用改变了，但是原有的值没有变化

//这种看似修改的方法实际上返回的是一个新的String对象
String c= a.subString(1,2);
```

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200103112326.png)

### 4.3. 线程安全
因为不可变所以线程安全
```java
public class TestString
{
    public static void main(String[] args) throws InterruptedException
    {
        String string = "0";
        TestThread testThread = new TestThread(string);//因为不可变，所以传递进去无论做了什么操作都不影响
        testThread.start();
        testThread.join();

        System.out.println(string);//0
    }
}

class TestThread extends Thread
{
    private String string;
    public TestThread(String string)
    {
        this.string = string;
    }

    @Override
    public void run()
    {
        this.string += "test";
        System.out.println(Thread.currentThread().getName() + ":" + this.string);
    }
}
```


### 4.4. String对+的重载
实际上使用的StringBuilder，并且调用append方法，最后调用toString方法

- 普通+
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200103111852.png)

- 循环+
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200103111903.png)


### 4.5. replaceFirst、replaceAll、replace区别
- `String replaceFirst(String regex, String replacement)`
基于正则的替换，替换第一个
- `String replaceAll(String regex, String replacement)`
基于正则的替换，替换全部
- `String replace(Char Sequencetarget, Char Sequencereplacement)`
普通的比较替换，替换全部


## 5. 参考链接

- [Java 源码分析 — String 的设计 \- 掘金](https://juejin.im/post/5a3522f8f265da43052eb265)
- [String源码分析 \- 掘金](https://juejin.im/post/59fffddc5188253d6816f9c1)
- [Java中String对"\+"的"重载" \- 掘金](https://juejin.im/post/5d9f0d536fb9a04e0e5e2c78)
- [java 中为什么说，String是线程安全的？为什么说StringBuilder是线程不安全的？分别举例证明。 \- OSCHINA](https://www.oschina.net/question/554770_228893)
- [为什么String被设计为不可变?是否真的不可变？ \- Jessica程序猿 \- 博客园](https://www.cnblogs.com/wuchanming/p/9201103.html)
- [Java提高篇——理解String 及 String\.intern\(\) 在实际中的应用 \- 萌小Q \- 博客园](https://www.cnblogs.com/Qian123/p/5707154.html)
