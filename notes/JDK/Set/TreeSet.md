[toc]

 

## 是什么

无序、不重复的集合，使用TreeMap实现

## 使用

```java
public class TreeSetTest
{
    public static void main(String[] args)
    {
        TreeSet<Integer> set = new TreeSet<>();
        set.add(1);
        set.add(2);
        set.remove(2);
        System.out.println(set.contains(1));
        System.out.println(set.contains(2));
        System.out.println(set.contains(3));
    }
}
```


## 源码分析


### 1. 1.构造方法
```java
public TreeSet() {
	//底层使用TreeMap实现
    this(new TreeMap<E,Object>());
}

```

### 2. 2.属性
```java
public class TreeSet<E> extends AbstractSet<E>
    implements NavigableSet<E>, Cloneable, java.io.Serializable
{

	//通过key的顺序访问的map接口
    private transient NavigableMap<E,Object> m;

	//作为map的value的占位符
    private static final Object PRESENT = new Object();
}
```


### 3. 3.其他方法
调用的TreeMap的方法，效率O（logN）

## 总结
底层使用TreeMap实现，value使用newObject作为占位符

