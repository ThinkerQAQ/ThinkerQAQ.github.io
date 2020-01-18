

[toc]




## 1. 是什么

线程安全的HashMap，底层使用sychronized+CAS+HashMap的结构（数组+链表+红黑树）实现

## 2. 如何使用

```java
public class ConcurrentHashMapTest
{
    public static void main(String[] args) throws InterruptedException
    {
        ConcurrentHashMap<Integer, Integer> map = new ConcurrentHashMap<>();
        Thread thread1 = new Thread(()->{
            for (int i = 0; i < 100000; i++)
            {
                map.put(i, i);
            }
        });

        Thread thread2 = new Thread(()->{
            for (int i = 100000; i < 200000; i++)
            {
                map.put(i, i);
            }
        });

        thread1.start();
        thread2.start();
        thread1.join();
        thread2.join();
        System.out.println(map);
        System.out.println(map.size());
        for (int i = 0; i < 200000; i++)
        {
            if (!map.contains(i))
            {
                throw new RuntimeException("并发put有问题");//不会抛出异常说明并发put没问题
            }
            System.out.println(map.remove(i));
        }
    }
}
```


## 3. 原理分析


### 3.1. 构造方法
```java
public ConcurrentHashMap() {
}
```


### 3.2. put方法【有加锁】
```java
public V put(K key, V value) {
    //把key和value传入putVal方法
    return putVal(key, value, false);
}
```

- putVal
```java
final V putVal(K key, V value, boolean onlyIfAbsent) {
    if (key == null || value == null) throw new NullPointerException();
    // (h ^ (h >>> 16)) & HASH_BITS(0x7fffffff)
    int hash = spread(key.hashCode());
    int binCount = 0;
    //死循环配合cas
    for (Node<K,V>[] tab = table;;) {
        Node<K,V> f; int n, i, fh;
        //如果table为空，第一次初始化table
        if (tab == null || (n = tab.length) == 0)
            tab = initTable();
        //链表头节点为空，那么尝试cas设置头节点
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            if (casTabAt(tab, i, null,
                         new Node<K,V>(hash, key, value, null)))
                break;                   // no lock when adding to empty bin
        }
        //有其他线程正在扩容？？
        else if ((fh = f.hash) == MOVED)
            tab = helpTransfer(tab, f);
        //链表头节点不为空
        else {
            V oldVal = null;
            //可能竞争很大，所以用synchronized加锁而不是cas
            //相比于JDK7的这里锁的粒度更加小了，锁的粒度缩小为数组中每个链表的头节点
            synchronized (f) {
                if (tabAt(tab, i) == f) {
                    if (fh >= 0) {
                        binCount = 1;
                        //遍历链表，并且用bitCount计数链表中节点个数
                        for (Node<K,V> e = f;; ++binCount) {
                            K ek;
                            //找到了相等的节点，那么保存旧val，并更新val，退出循环
                            if (e.hash == hash &&
                                ((ek = e.key) == key ||
                                 (ek != null && key.equals(ek)))) {
                                oldVal = e.val;
                                if (!onlyIfAbsent)
                                    e.val = value;
                                break;
                            }
                            Node<K,V> pred = e;
                            //到了尾节点，直接插入到末尾
                            if ((e = e.next) == null) {
                                pred.next = new Node<K,V>(hash, key,
                                                          value, null);
                                break;
                            }
                        }
                    }
                    //如果是树的节点，那么转调树
                    else if (f instanceof TreeBin) {
                        Node<K,V> p;
                        binCount = 2;
                        if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key,
                                                       value)) != null) {
                            oldVal = p.val;
                            if (!onlyIfAbsent)
                                p.val = value;
                        }
                    }
                }
            }
            //判断是否需要树化
            if (binCount != 0) {
                if (binCount >= TREEIFY_THRESHOLD)
                    treeifyBin(tab, i);
                if (oldVal != null)
                    return oldVal;
                break;
            }
        }
    }
    //更新数量
    addCount(1L, binCount);
    return null;
}
```

-   4行：计算key的hash，这里不是简单得使用key.hashCode方法
-   7行：死循环直到成功
-   10-11行：第一次进来table为空，所以需要初始化table
-   13-17行：第二次进来table不为空，链表肯定为空【头节点为空】，那么设置CAS头节点
-   22-72行：第三次进来若链表不为空【头节点不为空】，那么对头节点加锁，使用链表的操作或树的操作插入
-   75行：扩容操作



#### 3.2.1. 计算key的hash
- spread
```java
//h为key.hashCode()
static final int spread(int h) {
    //位运算
    return (h ^ (h >>> 16)) & HASH_BITS;
}
```
`h >>> 16`表示右移16bit，前面补0
`h ^ (h >>> 16)`表示保留高16bit
`(h ^ (h >>> 16)) & HASH_BITS`，其中HASH_BITS是`0x7fffffff`，结果还是一样的


假设Integer为8bit，右移4bit，HASH_BITS为`0111 1111`，那么计算如下：

|            公式             |         计算          |   结果    |
| --------------------------- | --------------------- | --------- |
| h >>> 4                     | 1001 1100 >>> 4       | 0000 1001 |
| h ^ (h >>> 4)               | 1001 1100 ^ 0000 1001 | 1001 0101 |
| (h ^ (h >>> 4)) & HASH_BITS | 1001 0101 & 0111 1111 | 0001 0101 |

#### 3.2.2. 死循环
```java
for (Node<K,V>[] tab = table;;) {
//....
}
```

#### 3.2.3. 第一次进来table为空，所以需要初始化table

```java
//如果table为空，第一次初始化table
if (tab == null || (n = tab.length) == 0)
    tab = initTable();
```

- initTable

```java
private final Node<K,V>[] initTable() {
    Node<K,V>[] tab; int sc;
    //这个也是个死循环
    while ((tab = table) == null || tab.length == 0) {
    	//sizeCtl<0表示有其他线程正在初始化或者扩容
        if ((sc = sizeCtl) < 0)
        	//让出cpu，让扩容或者初始化的线程执行
            Thread.yield(); // lost initialization race; just spin
        //当前线程正在尝试修改sizeCtl，成功后进入扩容逻辑
        else if (U.compareAndSwapInt(this, SIZECTL, sc, -1)) {
            try {
            	//第一次初始化
                if ((tab = table) == null || tab.length == 0) {
                    //容量为16
                    int n = (sc > 0) ? sc : DEFAULT_CAPACITY;
                    @SuppressWarnings("unchecked")
                    //创建长度为n的Node数组
                    Node<K,V>[] nt = (Node<K,V>[])new Node<?,?>[n];
                    table = tab = nt;
                    //sizeCtl为8
                    sc = n - (n >>> 2);
                }
            } finally {
                sizeCtl = sc;
            }
            break;
        }
    }
    return tab;
}
```
##### 3.2.3.1. 使用CAS加锁防止多线程同时初始化table

```java
 //当前线程正在尝试修改sizeCtl，成功后进入扩容逻辑
else if (U.compareAndSwapInt(this, SIZECTL, sc, -1)) {
    try {
    	//第一次初始化
        if ((tab = table) == null || tab.length == 0) {
            //容量为16
            int n = (sc > 0) ? sc : DEFAULT_CAPACITY;
            @SuppressWarnings("unchecked")
            //创建长度为n的Node数组
            Node<K,V>[] nt = (Node<K,V>[])new Node<?,?>[n];
            table = tab = nt;
            //sizeCtl为8
            sc = n - (n >>> 2);
        }
    } finally {
        sizeCtl = sc;
    }
    break;
}
```
##### 3.2.3.2. 其他线程让出CPU自旋等待
```java
while ((tab = table) == null || tab.length == 0) {
//sizeCtl<0表示正在初始化或者扩容
if ((sc = sizeCtl) < 0)
	//让出cpu，让扩容或者初始化的线程执行
    Thread.yield(); // lost initialization race; just spin
}
```

#### 3.2.4. 第二次进来table不为空，链表肯定为空【头节点为空】，那么设置CAS头节点
```java
//链表头节点为空，
else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
    //那么尝试cas设置头节点
    if (casTabAt(tab, i, null,
                 new Node<K,V>(hash, key, value, null)))
        break;                   // no lock when adding to empty bin
}
```
##### 3.2.4.1. 计算元素的位置
首先通过`(n - 1) & hash`位运算取低几位，相当于对数组长度取模，只不过效率更高。
然后拿到该位置的元素【每个元素都是一个链表的头节点】
```java
static final <K,V> Node<K,V> tabAt(Node<K,V>[] tab, int i) {
    //通过Unsafe类取的
    return (Node<K,V>)U.getObjectVolatile(tab, ((long)i << ASHIFT) + ABASE);
}
```
##### 3.2.4.2. CAS设置头节点
- casTabAt
```java
static final <K,V> boolean casTabAt(Node<K,V>[] tab, int i,
                                    Node<K,V> c, Node<K,V> v) {
    //也是通过Unsafe设置的
    return U.compareAndSwapObject(tab, ((long)i << ASHIFT) + ABASE, c, v);
}
```
#### 3.2.5. 第三次进来若链表不为空【头节点不为空】，那么对头节点加锁，使用链表的操作或树的操作插入
```java
 //链表头节点不为空
else {
    V oldVal = null;
    //可能竞争很大，所以用synchronized加锁而不是cas
    //相比于JDK7的这里锁的粒度更加小了，锁的粒度缩小为数组中每个链表的头节点
    //JDK7的是对segment（类似于多个链表头节点）加锁
    synchronized (f) {
        //头节点确实没有变化--啥时候会变化？
        if (tabAt(tab, i) == f) {
            if (fh >= 0) {
                binCount = 1;
                //遍历链表，并且用bitCount计数链表中节点个数
                for (Node<K,V> e = f;; ++binCount) {
                    K ek;
                    //找到了相等的节点，那么保存旧val，并更新val，退出循环
                    if (e.hash == hash &&
                        ((ek = e.key) == key ||
                         (ek != null && key.equals(ek)))) {
                        oldVal = e.val;
                        if (!onlyIfAbsent)
                            e.val = value;
                        break;
                    }
                    Node<K,V> pred = e;
                    //到了尾节点，直接插入到末尾，退出循环
                    if ((e = e.next) == null) {
                        pred.next = new Node<K,V>(hash, key,
                                                  value, null);
                        break;
                    }
                }
            }
            //如果是树的节点，那么转调树
            else if (f instanceof TreeBin) {
                Node<K,V> p;
                binCount = 2;
                if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key,
                                               value)) != null) {
                    oldVal = p.val;
                    if (!onlyIfAbsent)
                        p.val = value;
                }
            }
        }
    }
    //判断是否需要树化
    if (binCount != 0) {
        if (binCount >= TREEIFY_THRESHOLD)
            treeifyBin(tab, i);
        if (oldVal != null)
            return oldVal;
        break;
    }
}
```

##### 3.2.5.1. 具体的插入操作

-   7行：首先对头节点加锁
-   13-32行：如果是链表的节点，调用链表的方法插入节点
    -   13行：遍历链表
    -   16-22行：找到了相等的节点，那么替换value
    -   26-29行：没有找到相等的节点，插入到链表末尾
-   34-43行：如果是树的节点，调用树的方法插入节点

##### 

#### 3.2.6. 扩容的操作
看不太懂，先放着
```java
private final void addCount(long x, int check) {
    CounterCell[] as; long b, s;
    if ((as = counterCells) != null ||
        !U.compareAndSwapLong(this, BASECOUNT, b = baseCount, s = b + x)) {
        CounterCell a; long v; int m;
        boolean uncontended = true;
        if (as == null || (m = as.length - 1) < 0 ||
            (a = as[ThreadLocalRandom.getProbe() & m]) == null ||
            !(uncontended =
              U.compareAndSwapLong(a, CELLVALUE, v = a.value, v + x))) {
            fullAddCount(x, uncontended);
            return;
        }
        if (check <= 1)
            return;
        s = sumCount();
    }
    if (check >= 0) {
        Node<K,V>[] tab, nt; int n, sc;
        while (s >= (long)(sc = sizeCtl) && (tab = table) != null &&
               (n = tab.length) < MAXIMUM_CAPACITY) {
            int rs = resizeStamp(n);
            if (sc < 0) {
                if ((sc >>> RESIZE_STAMP_SHIFT) != rs || sc == rs + 1 ||
                    sc == rs + MAX_RESIZERS || (nt = nextTable) == null ||
                    transferIndex <= 0)
                    break;
                if (U.compareAndSwapInt(this, SIZECTL, sc, sc + 1))
                    transfer(tab, nt);
            }
            else if (U.compareAndSwapInt(this, SIZECTL, sc,
                                         (rs << RESIZE_STAMP_SHIFT) + 2))
                transfer(tab, null);
            s = sumCount();
        }
    }
}
```

### 3.3. get方法【没有加锁】

```java
public V get(Object key) {
    Node<K,V>[] tab; Node<K,V> e, p; int n, eh; K ek;
    //计算key的hash值
    int h = spread(key.hashCode());
    //找到数组中的下标
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (e = tabAt(tab, (n - 1) & h)) != null) {
        //链表第一个节点就相等
        if ((eh = e.hash) == h) {
            if ((ek = e.key) == key || (ek != null && key.equals(ek)))
                return e.val;
        }
        else if (eh < 0)//hash<0指得是什么情况
    		//find 啥用处??
            return (p = e.find(h, key)) != null ? p.val : null;
        //遍历链表找到相等的节点
        while ((e = e.next) != null) {
            if (e.hash == h &&
                ((ek = e.key) == key || (ek != null && key.equals(ek))))
                return e.val;
        }
    }
    //没有找到返回null
    return null;
}
```

#### 3.3.1. 计算key的hash值
- spread
```java
static final int spread(int h) {
    return (h ^ (h >>> 16)) & HASH_BITS;
}
```
#### 3.3.2. 计算元素的位置
首先通过`(n - 1) & hash`位运算取低几位，相当于对数组长度取模，只不过效率更高。
然后拿到该位置的元素【每个元素都是一个链表的头节点】
```java
static final <K,V> Node<K,V> tabAt(Node<K,V>[] tab, int i) {
    //通过Unsafe类取的
    return (Node<K,V>)U.getObjectVolatile(tab, ((long)i << ASHIFT) + ABASE);
}
```

#### 3.3.3. 比较链表头节点是否相等
```java
//链表第一个节点就相等
if ((eh = e.hash) == h) {
    if ((ek = e.key) == key || (ek != null && key.equals(ek)))
        return e.val;
}
```
#### 3.3.4. 遍历链表找到相等的节点
```java
//遍历链表找到相等的节点
while ((e = e.next) != null) {
    if (e.hash == h &&
        ((ek = e.key) == key || (ek != null && key.equals(ek))))
        return e.val;
}
```

### 3.4. remove方法【有加锁】
```java
public V remove(Object key) {
    return replaceNode(key, null, null);
}

```

- replaceNode
```java
final V replaceNode(Object key, V value, Object cv) {
    int hash = spread(key.hashCode());
    //死循环
    for (Node<K,V>[] tab = table;;) {
        Node<K,V> f; int n, i, fh;
        //table为空
        if (tab == null || (n = tab.length) == 0 ||
            (f = tabAt(tab, i = (n - 1) & hash)) == null)
            break;
        //扩容
        else if ((fh = f.hash) == MOVED)
            tab = helpTransfer(tab, f);
        else {
            V oldVal = null;
            boolean validated = false;
            //使用synchronized加锁
            synchronized (f) {
                if (tabAt(tab, i) == f) {
                    if (fh >= 0) {
                        validated = true;
                        //遍历链表中的每一个节点
                        for (Node<K,V> e = f, pred = null;;) {
                            K ek;
                            //找到了相等的节点
                            if (e.hash == hash &&
                                ((ek = e.key) == key ||
                                 (ek != null && key.equals(ek)))) {
                                V ev = e.val;
                                if (cv == null || cv == ev ||
                                    (ev != null && cv.equals(ev))) {
                                    oldVal = ev;
                                    if (value != null)
                                        e.val = value;
                                    //e不是头节点，那么直接更新链表指针
                                    else if (pred != null)
                                        pred.next = e.next;
                                    //e是头节点
                                    else
                                        setTabAt(tab, i, e.next);
                                }
                                break;
                            }
                            pred = e;
                            if ((e = e.next) == null)
                                break;
                        }
                    }
                    else if (f instanceof TreeBin) {
                        validated = true;
                        TreeBin<K,V> t = (TreeBin<K,V>)f;
                        TreeNode<K,V> r, p;
                        if ((r = t.root) != null &&
                            (p = r.findTreeNode(hash, key, null)) != null) {
                            V pv = p.val;
                            if (cv == null || cv == pv ||
                                (pv != null && cv.equals(pv))) {
                                oldVal = pv;
                                if (value != null)
                                    p.val = value;
                                else if (t.removeTreeNode(p))
                                    setTabAt(tab, i, untreeify(t.first));
                            }
                        }
                    }
                }
            }
            if (validated) {
                if (oldVal != null) {
                    if (value == null)
                        addCount(-1L, -1);
                    return oldVal;
                }
                break;
            }
        }
    }
    return null;
}
```
#### 3.4.1. 死循环
```java
for (Node<K,V>[] tab = table;;) {
}
```
#### 3.4.2. table为空或者链表头节点为空，说明不存在那么返回空
```java
//table为空
if (tab == null || (n = tab.length) == 0 ||
    (f = tabAt(tab, i = (n - 1) & hash)) == null)
    break;//break循环，最后返回null
```
#### 3.4.3. 头节点不为空先加锁，然后使用树或者链表的操作删除节点
```java
else {
    V oldVal = null;
    boolean validated = false;
    //使用synchronized加锁
    synchronized (f) {
        if (tabAt(tab, i) == f) {
            if (fh >= 0) {
                validated = true;
                //遍历链表中的每一个节点
                for (Node<K,V> e = f, pred = null;;) {
                    K ek;
                    //找到了相等的节点
                    if (e.hash == hash &&
                        ((ek = e.key) == key ||
                         (ek != null && key.equals(ek)))) {
                        V ev = e.val;
                        if (cv == null || cv == ev ||
                            (ev != null && cv.equals(ev))) {
                            oldVal = ev;
                            if (value != null)
                                e.val = value;
                            //e不是头节点，那么直接更新链表指针
                            else if (pred != null)
                                pred.next = e.next;
                            //e是头节点
                            else
                                setTabAt(tab, i, e.next);
                        }
                        break;
                    }
                    pred = e;
                    if ((e = e.next) == null)
                        break;
                }
            }
            else if (f instanceof TreeBin) {
                validated = true;
                TreeBin<K,V> t = (TreeBin<K,V>)f;
                TreeNode<K,V> r, p;
                if ((r = t.root) != null &&
                    (p = r.findTreeNode(hash, key, null)) != null) {
                    V pv = p.val;
                    if (cv == null || cv == pv ||
                        (pv != null && cv.equals(pv))) {
                        oldVal = pv;
                        if (value != null)
                            p.val = value;
                        else if (t.removeTreeNode(p))
                            setTabAt(tab, i, untreeify(t.first));
                    }
                }
            }
        }
}
```
##### 3.4.3.1. 链表的删除节点操作--更新指针
```java
//遍历链表中的每一个节点
for (Node<K,V> e = f, pred = null;;) {
    K ek;
    //找到了相等的节点
    if (e.hash == hash &&
        ((ek = e.key) == key ||
         (ek != null && key.equals(ek)))) {
        V ev = e.val;
        if (cv == null || cv == ev ||
            (ev != null && cv.equals(ev))) {
            oldVal = ev;
            if (value != null)
                e.val = value;
            //这个节点e不是头节点，那么直接更新前一个节点的next指针
            else if (pred != null)
                pred.next = e.next;
            //这个节点e是头节点，那么CAS设置e.next为头节点
            else
                setTabAt(tab, i, e.next);
        }
        break;
    }
    pred = e;
    if ((e = e.next) == null)
        break;
}
```

- setTabAt
```java
static final <K,V> void setTabAt(Node<K,V>[] tab, int i, Node<K,V> v) {
    U.putObjectVolatile(tab, ((long)i << ASHIFT) + ABASE, v);
}
```

### 3.5. containsKey方法【没有加锁】
```java
public boolean containsKey(Object key) {
    //调用get方法，也是不加锁
    return get(key) != null;
}
```



## 4. 参考链接

- [聊聊并发（四）——深入分析ConcurrentHashMap\-InfoQ](https://www.infoq.cn/article/ConcurrentHashMap/)

