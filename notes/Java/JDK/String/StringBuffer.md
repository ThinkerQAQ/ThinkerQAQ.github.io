[toc]

 

## 1. 是什么

线程安全的、可变字符串
其实就是在StringBuilder的基础上加了synchronized关键字

## 2. 如何使用

```java
public class TestStringBuilder
{
    public static void main(String[] args) throws InterruptedException
    {
        StringBuffer stringBuffer = new StringBuffer();

        Thread thread1 = new Thread(() -> {
            for (int i = 0; i < 5000; i++)
            {
                stringBuffer.append("aaaa");
            }
        });
        Thread thread2 = new Thread(() -> {
            for (int i = 0; i < 5000; i++)
            {
                stringBuffer.append("aaaa");
            }
        });

        thread1.start();
        thread2.start();

        thread1.join();
        thread2.join();


        System.out.println(stringBuffer.toString());
        System.out.println(stringBuffer.length() == 5000 * 2 * 4);//true

    }
}

```



## 3. 原理分析


### 3.1. 构造函数
```java
 public final class StringBuffer//一样是final的
    extends AbstractStringBuilder
    implements java.io.Serializable, CharSequence
{
	public StringBuffer() {
		//跟StringBuilder一样调用AbstractStringBuilder的构造方法
		super(16);//默认容量16个
	}

}

abstract class AbstractStringBuilder implements Appendable, CharSequence {
   
    char[] value;
    int count;
    
	AbstractStringBuilder(int capacity) {
		value = new char[capacity];
	}
}
```


### 3.2. append方法
```java
//加了synchronized修饰
public synchronized StringBuffer append(String str) {
    toStringCache = null;
    super.append(str);
    return this;
}

```


### 3.3. toString
```java
//加了synchronized修饰
public synchronized String toString() {
    if (toStringCache == null) {
        toStringCache = Arrays.copyOfRange(value, 0, count);
    }
    return new String(toStringCache, true);
}
```


### 3.4. subString
```java
public synchronized String substring(int start, int end) {
	return super.substring(start, end);
}
```

