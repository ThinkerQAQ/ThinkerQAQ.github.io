[toc]

 

## 1. 是什么

可变的、线程不安全的字符串
有点像ArrayList的实现，底层使用char数组，不够容量时需要扩容

## 2. 如何使用

```java
public class StringBuilderTest
{
    public static void main(String[] args)
    {
        StringBuilder builder = new StringBuilder();
        builder.append("test");
    }
}
```


## 3. 原理分析


### 3.1. 构造方法

```java
//不可被继承、可序列化
public final class StringBuilder
    extends AbstractStringBuilder
    implements java.io.Serializable, CharSequence
{
	public StringBuilder() {
		//调用父类（AbstractBuilder）的构造方法，初始化容量为16
		super(16);
	}
}


//AbstractBuilder的构造方法
abstract class AbstractStringBuilder implements Appendable, CharSequence {
   
   //没有用final修饰，说明其引用可变
    char[] value;  
    int count;
    AbstractStringBuilder() {
    }

    AbstractStringBuilder(int capacity) {
    	//创建字符数组
        value = new char[capacity];
    }
```


### 3.2. append方法

 直接在内部的char数组后面添加字符
 如果容量不够需要扩容，为原来的2倍+2
```java
public StringBuilder append(String str) {
		//调用父类的append方法
        super.append(str);
        return this;
    }
```

- AbstractBuilder的append方法

```java
public AbstractStringBuilder append(String str) {
		//null的话会在后面加上“null”字符串
        if (str == null)
            return appendNull();
        //同样需要保证容量充足
        int len = str.length();
        ensureCapacityInternal(count + len);
    	//String类的getChars方法。检查参数是否合法，并且调用System.arraycopy复制数组
        str.getChars(0, len, value, count);
        count += len;
        return this;
    }
    
 private AbstractStringBuilder appendNull() {
        int c = count;
    	//确保容量足够容纳 原有容量+4
        ensureCapacityInternal(c + 4);
        final char[] value = this.value;
        value[c++] = 'n';
        value[c++] = 'u';
        value[c++] = 'l';
        value[c++] = 'l';
        count = c;
        return this;
    }
private void ensureCapacityInternal(int minimumCapacity) {
        // overflowconscious code
        //用减法是防止溢出
        if (minimumCapacity  value.length > 0) {
            value = Arrays.copyOf(value,
            		//计算扩容的容量
                    newCapacity(minimumCapacity));
        }
    }
    
private int newCapacity(int minCapacity) {
    // overflowconscious code
    //原有容量*2+2
    int newCapacity = (value.length << 1) + 2;
	//原有容量*2+2 < 最小需要的容量，那么以最小需要的容量为准
    if (newCapacity  minCapacity < 0) {
        newCapacity = minCapacity;
    }
    //计算后的新容量溢出或者超出最大限制private static final int MAX_ARRAY_SIZE = Integer.MAX_VALUE  8
    return (newCapacity <= 0 || MAX_ARRAY_SIZE  newCapacity < 0)
		//改用最小需要的容量
        ? hugeCapacity(minCapacity)
        //没有则直接返回
        : newCapacity;
}

private int hugeCapacity(int minCapacity) {
	//最小需要的容量超出整形最大值，抛出OOM
    if (Integer.MAX_VALUE  minCapacity < 0) { // overflow
        throw new OutOfMemoryError();
    }
    //要么取最小需要容量，要么取最大限制
    return (minCapacity > MAX_ARRAY_SIZE)
        ? minCapacity : MAX_ARRAY_SIZE;
}

//String类的getChars方法
public void getChars(int srcBegin, int srcEnd, char dst[], int dstBegin) {
        if (srcBegin < 0) {
            throw new StringIndexOutOfBoundsException(srcBegin);
        }
        if (srcEnd > value.length) {
            throw new StringIndexOutOfBoundsException(srcEnd);
        }
        if (srcBegin > srcEnd) {
            throw new StringIndexOutOfBoundsException(srcEnd  srcBegin);
        }
        System.arraycopy(value, srcBegin, dst, dstBegin, srcEnd  srcBegin);
    }
```


### 3.3. toString

```java
public String toString() {
        // 直接构造String对象
        return new String(value, 0, count);
    }
```


### 3.4. subString

```java
public String substring(int start, int end) {
	//index越界检查
    if (start < 0)
        throw new StringIndexOutOfBoundsException(start);
    if (end > count)
        throw new StringIndexOutOfBoundsException(end);
    if (start > end)
        throw new StringIndexOutOfBoundsException(end  start);
    //使用String构造
    return new String(value, start, end  start);
}

```
