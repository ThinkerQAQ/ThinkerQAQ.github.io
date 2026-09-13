---
title: "5.27 JDK1.7"
description: "1. 问题 1.1. 手写HashMap 1.1.1. Entry 1.1.2. put操作 1.1.3. get操作 1.1.4. remove操作 1.2. 为什么构造函数中需要把capacity转成2的power 跟indexFor计算数组下标有关 不是计算Hash后对table.length"
sourcePath: "Java/JDK/Map/HashMap/JDK1.7.md"
category: "java"
categoryLabel: "Java"
topic: "JDK"
topicLabel: "5.JDK"
order: 149
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-30T12:29:58Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. 问题


### 1.1. 手写HashMap
#### 1.1.1. Entry

```java
class Entry<K,V> implements Map.Entry<K,V> {
    final K key;
    V value;
    Entry<K,V> next;//链地址法
    }
```

#### 1.1.2. put操作

```java
public V put(K key, V value) {
	//计算Hash并计算数组中的下标
    int hash = hash(key);
    int i = indexFor(hash, table.length);
	//先遍历链表查看是否有相等的key，有替换value
    for (Entry<K,V> e = table[i]; e != null; e = e.next) {
        Object k;
        if (e.hash == hash && ((k = e.key) == key || key.equals(k))) {
            V oldValue = e.value;
            e.value = value;
            e.recordAccess(this);
            return oldValue;
        }
    }
	//没有则使用头插法
    addEntry(hash, key, value, i);
    return null;
}
```

#### 1.1.3. get操作

```java
final Entry<K,V> getEntry(Object key) {
				//计算hash值
    int hash = (key == null) ? 0 : hash(key);
    		//计算数组下标
    		//遍历链表中的每个元素判断key相等
    for (Entry<K,V> e = table[indexFor(hash, table.length)];
         e != null;
         e = e.next) {
        Object k;
        if (e.hash == hash &&
            ((k = e.key) == key || (key != null && key.equals(k))))
            return e;
    }
    return null;
}
```

#### 1.1.4. remove操作
```java
final Entry<K,V> removeEntryForKey(Object key) {
			//找到相应的链表
    int hash = (key == null) ? 0 : hash(key);
    int i = indexFor(hash, table.length);
    Entry<K,V> prev = table[i];
    Entry<K,V> e = prev;

			//遍历链表删除（其实就是链表的删除操作，需要一个prev和一个current）
    while (e != null) {
        Entry<K,V> next = e.next;
        Object k;
        if (e.hash == hash &&
            ((k = e.key) == key || (key != null && key.equals(k)))) {
            modCount++;
            size--;
            if (prev == e)
                table[i] = next;
            else
                prev.next = next;
            e.recordRemoval(this);
            return e;
        }
        prev = e;
        e = next;
    }

    return e;
}
```


### 1.2. 为什么构造函数中需要把capacity转成2的power
跟indexFor计算数组下标有关
```java
static int indexFor(int h, int length) {
    return h & (length-1);
}
```

不是计算Hash后对table.length取余，而是与操作。
```
h:			1001 1001
length:		0001 0000
length-1:	0000 1111
&:			0000 1001
```
如上&的结果保留的是h的最后4bit。

### 1.3. 扩容操作
什么时候发生扩容
```java
//当前hashmap中的数量（包括链表中的）已经超过阈值时扩容
if ((size >= threshold) && (null != table[bucketIndex])) {
        resize(2 * table.length);//两倍的数组长度
    }
```

#### 1.3.1. 扩容的逻辑
参考
> 并发put的后get发生死循环

### 1.4. 如何解决Hash冲突的？
链地址法。即数组+链表

### 1.5. 发生Hash冲突的时候是头插入还是尾插入？
头插入。这样效率是最高的。
```java
void createEntry(int hash, K key, V value, int bucketIndex) {
			//保存旧的链表头部
    Entry<K,V> e = table[bucketIndex];
    		//创建一个新的entry，并把next指向旧的链表头部。
    		//新的链表头部指向这个新的entry
    table[bucketIndex] = new Entry<>(hash, key, value, e);
    size++;
}
```


### 1.6. 并发put的后get发生死循环？
1.7的put操作是头插入的。两个线程同时put并且resize的时候会出现环形链表的情况，所以get操作会出现死循环
resize中有个transfer，需要把旧数组中的所有元素转移到新的数组中

```java
void transfer(Entry[] newTable, boolean rehash) {
    int newCapacity = newTable.length;
    			//遍历数组中的每个元素（链表）
    for (Entry<K,V> e : table) {
    					//遍历链表中的每个元素
        while(null != e) {
            Entry<K,V> next = e.next;
            				    //重新计算hash
            if (rehash) {
                e.hash = null == e.key ? 0 : hash(e.key);
            }
            					//计算新的下标
            int i = indexFor(e.hash, newCapacity);
            					//头插法
            e.next = newTable[i];
            newTable[i] = e;

            e = next;
        }
    }
}
```
#### 1.6.1. 参考
<https://blog.csdn.net/zhuqiuhui/article/details/51849692>

### 1.7. key可以为NULL么

可以。	1.7中为table中的第一个元素。
put操作中判断key为NULL的时候，会调用putForNullKey

```java
private V putForNullKey(V value) {
			//在数组第一个元素的链表上遍历，找到key为null的则替换value并返回旧value
    for (Entry<K,V> e = table[0]; e != null; e = e.next) {
        if (e.key == null) {
            V oldValue = e.value;
            e.value = value;
            e.recordAccess(this);
            return oldValue;
        }
    }
    modCount++;
    		//没有则插入到数组第一个位置
    addEntry(0, null, value, 0);
    return null;
}
```


### 1.8. ConcurrentModificationException
参考：[fail-fast.md](/notes/java/JDK/List/fail-fast/)
遍历时（get）执行删除操作（remove）会抛出这个异常，这叫做fast-fail机制
这是modCount和expectedCount不相等导致的
## 2. 参考
- [java \- Why is a ConcurrentModificationException thrown and how to debug it \- Stack Overflow](https://stackoverflow.com/questions/602636/why-is-a-concurrentmodificationexception-thrown-and-how-to-debug-it)
- [Avoiding the ConcurrentModificationException in Java \| Baeldung](https://www.baeldung.com/java-concurrentmodificationexception)
