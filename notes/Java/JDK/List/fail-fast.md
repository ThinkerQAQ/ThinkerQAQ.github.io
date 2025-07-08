[toc]

## 1. fail-fast与fail-safe
fail-fast：如果一个系统，当有异常或者错误发生时就立即中断执行，这种设计称之为fail-fast
fail-safe：如果一个系统，可以在某种异常或者错误发生时继续执行，不会被中断，这种设计称之为fail-safe

## 2. Java迭代器的设计
for-each底层也是通过iterator实现的


```java
public class ForEarch
{
    public static void main(String[] args)
    {
        List<String> stringList = Arrays.asList("A", "B", "C");
        for (String s : stringList)
        {
            System.out.println(s);
        }
    }
}
```

- 查看字节码如下图：
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200201204823.png)

## 3. 示例
### 3.1. fail-fast的List 

```java
public class ConcurrentModificationExceptionTest3
{
    public static void main(String[] args)
    {
        List<String> stringList = new ArrayList<>();
        for (int i = 0; i < 1000; i++)
        {
            stringList.add(String.valueOf(i));
        }

        Iterator<String> iterator = stringList.iterator();
        while (iterator.hasNext())
        {
            String s = iterator.next();
            System.out.println(s);
            stringList.add("1");
        }
    }
}
```


### 3.2. fail-safe的List

```java
public class ConcurrentModificationExceptionTest2
{
    public static void main(String[] args)
    {
        CopyOnWriteArrayList<String> stringList = new CopyOnWriteArrayList<>();
        for (int i = 0; i < 1000; i++)
        {
            stringList.add(String.valueOf(i));
        }

        Iterator<String> iterator = stringList.iterator();
        while (iterator.hasNext())
        {
            String s = iterator.next();
            System.out.println(s);
            stringList.add("1");//新增加的数不会在上面的sout输出
        }
        System.out.println(stringList);
    }
}
```


## 4. 原理分析

### 4.1. fail-fast

#### 4.1.1. 增删该的时候会修改modCount

- ArrayList add

```java
public boolean add(E e) {
    ensureCapacityInternal(size + 1);  // Increments modCount!!
    elementData[size++] = e;
    return true;
}

private void ensureCapacityInternal(int minCapacity) {
    ensureExplicitCapacity(calculateCapacity(elementData, minCapacity));
}

private void ensureExplicitCapacity(int minCapacity) {
    modCount++;//这里修改了modCount

    // overflow-conscious code
    if (minCapacity - elementData.length > 0)
        grow(minCapacity);
}
```

#### 4.1.2. 创建迭代器的时候会初始化expectedModCount为modCount

- iterator

```java
public Iterator<E> iterator() {
    //创建
    return new Itr();
}

```

- ArrayList.Itr
```java
private class Itr implements Iterator<E> {
    int cursor;       // index of next element to return
    int lastRet = -1; // index of last element returned; -1 if no such
    int expectedModCount = modCount;//这个迭代器里的expectedModCount会初始化为ArrayList当前的modCount

    Itr() {}
```

#### 4.1.3. 使用迭代器遍历集合的时候会检查expectedModCount是否等于modCount

- ArrayList.Itr#next

```java
public E next() {
    checkForComodification();
    int i = cursor;
    if (i >= size)
        throw new NoSuchElementException();
    Object[] elementData = ArrayList.this.elementData;
    if (i >= elementData.length)
        throw new ConcurrentModificationException();
    cursor = i + 1;
    return (E) elementData[lastRet = i];
}
```

- ArrayList.Itr#checkForComodification

```java
final void checkForComodification() {
    if (modCount != expectedModCount)
        throw new ConcurrentModificationException();
}
```

可以看出如果遍历过程中有修改list的话，那么通过next获取下一个元素的时候检查modCount肯定跟expectedModCount不等，会抛出`ConcurrentModificationException`


### 4.2. fail-safe

#### 4.2.1. 增删改的时候会创建新的数组（复制旧数组的内容）

- add

```java
public boolean add(E e) {
        final ReentrantLock lock = this.lock;
        lock.lock();
        try {
            Object[] elements = getArray();
            int len = elements.length;
            //复制一份旧数组进行操作
            Object[] newElements = Arrays.copyOf(elements, len + 1);
            newElements[len] = e;
            setArray(newElements);
            return true;
        } finally {
            lock.unlock();
        }
    }
```
#### 4.2.2. 创建迭代器的时候用的就是旧数组
- CopyOnWriteArrayList#iterator

```java
public Iterator<E> iterator() {
    //创建CopyOnWriteArrayList.COWIterator#COWIterator
    return new COWIterator<E>(getArray(), 0);
}
```

- CopyOnWriteArrayList.COWIterator#COWIterator

```java
static final class COWIterator<E> implements ListIterator<E> {
    /** Snapshot of the array */
    private final Object[] snapshot;
    /** Index of element to be returned by subsequent call to next.  */
    private int cursor;

    private COWIterator(Object[] elements, int initialCursor) {
        cursor = initialCursor;
        snapshot = elements;
    }
```

#### 4.2.3. 使用迭代器遍历集合的时候用的就是旧数组

```java
@SuppressWarnings("unchecked")
public E next() {
    if (! hasNext())
        throw new NoSuchElementException();
    return (E) snapshot[cursor++];
}
```

## 5. 总结

- fail-fast的原理就是创建迭代器的时候会初始化`expectedCount=modCount`，遍历的时候会检查这两者是否相等，如果遍历中修改了list那么`expectedCount != modCount`，就会抛出异常

- fail-safe的原理就是创建迭代器的时候会复制一份原有的数据，遍历的时候迭代的是复制后的数据，所以即使遍历中修改了list，也不会影响到这份复制的数据，只不过看不到最新的数据罢了