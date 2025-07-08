[toc]

 

## 1. 是什么

线程安全的list

## 2. 如何使用

```java
public class SychronizedListTest
{
    public static void main(String[] args) throws InterruptedException
    {
        List<Integer> list = Collections.synchronizedList(new ArrayList<>());
        Thread thread1 = new Thread(() -> {
            for (int i = 0; i < 10000; i++)
            {
                list.add(i);
            }
        });

        Thread thread2 = new Thread(() -> {
            for (int i = 10000; i < 20000; i++)
            {
                list.add(i);
            }
        });

        thread1.start();
        thread2.start();

        thread1.join();
        thread2.join();

        assert list.size() == 20000;

        for (int i = 0; i < 20000; i++)
        {
            assert list.contains(i);
        }

        list.remove(2);
        System.out.println(list.contains(1));//true
        System.out.println(list.contains(2));//false

    }
}
```


## 3. 源码分析


### 3.1. synchronizedList方法

```java
public static <T> List<T> synchronizedList(List<T> list) {
    return (list instanceof RandomAccess ?
            new SynchronizedRandomAccessList<>(list) :
            // 使用SynchronizedList实现
            new SynchronizedList<>(list));
}
```


#### 3.1.1. 调用SynchronizedList的构造方法
```java
static class SynchronizedList<E>
        extends SynchronizedCollection<E>
        implements List<E> {

        //保存List
        final List<E> list;
        
		SynchronizedList(List<E> list) {
			//调用的SynchronizedCollection构造
			super(list);
			this.list = list;
		}


}


```

#### 3.1.2. 初始化锁对象为当前正在构造的list
```java

static class SynchronizedCollection<E> implements Collection<E>, Serializable {

	//由final修饰，引用不能改变
	final Collection<E> c;  // Backing Collection
	final Object mutex;     // Object on which to synchronize

	SynchronizedCollection(Collection<E> c) {
		this.c = Objects.requireNonNull(c);
		//使用当前正在构造的实例对象作为锁
		mutex = this;
	}
```


### 3.2. 其他方法

```java
public E get(int index) {
    synchronized (mutex) {return list.get(index);}
}
public E set(int index, E element) {
    synchronized (mutex) {return list.set(index, element);}
}
public void add(int index, E element) {
    synchronized (mutex) {list.add(index, element);}
}
public E remove(int index) {
    synchronized (mutex) {return list.remove(index);}
}

```

#### 3.2.1. 使用synchronized代码块加锁
```java
synchronized (mutex)
{
//...
}
```
#### 3.2.2. 转而调用list的方法
```java
list.remove(index)

```