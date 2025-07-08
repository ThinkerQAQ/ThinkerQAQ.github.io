[toc]

 

## 1. 是什么

无序、不重复的集合，使用HashMap实现

## 2. 如何使用

```java
public class HashSetTest
{
    public static void main(String[] args)
    {
        HashSet<Integer> set = new HashSet<>();
        set.add(1);
        set.add(2);
        set.remove(2);
        System.out.println(set.contains(1));
        System.out.println(set.contains(2));
        System.out.println(set.contains(3));
    }

}

```

## 3. 源码分析

### 3.1. uml
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200123113342.png)
可序列化，可克隆

### 3.2. 构造方法
```java
public HashSet() {
	//就是使用的HashMap实现的
    map = new HashMap<>();
}
```


### 3.3. 属性
```java
public class HashSet<E>
    extends AbstractSet<E>
    implements Set<E>, Cloneable, java.io.Serializable
{
	//底层使用map实现
    private transient HashMap<E,Object> map;
	//作为value的占位符
    private static final Object PRESENT = new Object();
}
```


### 3.4. add方法
 效率为O（1）
```java
public boolean add(E e) {
	//把e作为map的key，PRESENT作为value
    return map.put(e, PRESENT)==null;
}
```


### 3.5. contains方法
  效率为O（1）
```java
public boolean contains(Object o) {
	//调用HashMap的containsKey方法
    return map.containsKey(o);
}
```


### 3.6. remove方法
  效率为O（1）
```java
 public boolean remove(Object o) {
 //调用HashMap的remove方法
    return map.remove(o)==PRESENT;
}
```


## 4. 总结

HashSet底层是通过HashMap实现的，value使用new Object()作为占位符

