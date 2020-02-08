[toc]



## 1. 是什么

实现O(1)存取效率的key-value对数据结构

## 2. 如何使用

```java
public class HashMapTest
{
    public static void main(String[] args)
    {
        HashMap<String, Object> map = new HashMap<>();
        map.put("key1", "value1");

        System.out.println(map.get("key1"));
        map.remove("key1");

        map.containsKey("key1");
    }
}
```


## 3. 原理分析

### 3.1. uml
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200122230723.png)

可克隆，可序列化，实现了Map

### 3.2. 构造方法

```java

public class HashMap<K,V> extends AbstractMap<K,V>
    implements Map<K,V>, Cloneable, Serializable {
    //使用Node数组实现，使用链地址法解决Hash冲突
    transient Node<K,V>[] table;
    //默认的初始容量
    static final int DEFAULT_INITIAL_CAPACITY = 1 << 4; // aka 16
    //最大容量
    static final int MAXIMUM_CAPACITY = 1 << 30;
    //默认的加载因子
    static final float DEFAULT_LOAD_FACTOR = 0.75f;
    //链表转树的长度
    static final int TREEIFY_THRESHOLD = 8;
    //树转回链表的长度
    static final int UNTREEIFY_THRESHOLD = 6;

    static final int MIN_TREEIFY_CAPACITY = 64; 

    public HashMap() {
    //设置默认加载因子
    //table中已有的元素个数/table所有元素的个数，当这个比值>=0.75的时候需要扩容
    //或者说使用的容量到达16*0.75=12时需要扩容
    this.loadFactor = DEFAULT_LOAD_FACTOR; // all other fields defaulted
    }
}
```


### 3.3. put方法

总体伪算法如下：

- 计算key的hash值
- 使用hash值&数组长度1计算改数据存放的位置i
    - table为空，进行扩容
    - 如果位置i为空，那么用（key，value）存入该位置
    - 如果位置i不为空
        - 比较该位置的key与新的key是否相等，是则替换value
        - 否则
            - 如果是树节点，那么调用红黑树的插入操作
            - 如果是链表节点，那么遍历链表
                - 如果找到key相同的节点，替换value
                - 否则插入到链表尾部
- 插入完毕之后比较size是否大于容量*加载因子，是则需要扩容
    - 容量为原来的两倍
    - 创建一个新的node数组，原来数组的元素迁移到这个数组中

- put

```java
public V put(K key, V value) {
    return putVal(hash(key), key, value, false, true);
}

```

#### 3.3.1. 计算key的hash值
- hash
```java
//hash函数
static final int hash(Object key) {
    int h;
    //hashCode 异或 hashCode 右移16bit
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

- putVal
```java
final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
               boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;
	//table为空或者长度为0
    if ((tab = table) == null || (n = tab.length) == 0)
    	//第一次扩容
        n = (tab = resize()).length;
    //使用hash至以及数组长度计算下标，如果table[下标]为空，即没有元素，直接赋值即可
    if ((p = tab[i = (n  1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);
    //否则说明table[下标]有元素
    else {
        Node<K,V> e; K k;
        //头节点不仅hash值相同，key也equals（即头节点就是要找的节点），那么保存这个节点以便后续使用
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;
        //头节点不是要找的节点，同时是个TreeNode，那么转调tree的操作
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        //头节点不是要找的节点，同时是普通的链表
        else {
        	//遍历链表找，同时记录遍历了几个元素存到bitCount里。
            for (int binCount = 0; ; ++binCount) {
            	//到达链表的尾部
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    //判断bitCount是否达到树化的限度，是则树化
                    if (binCount >= TREEIFY_THRESHOLD  1) // 1 for 1st
                        treeifyBin(tab, hash);
                    break;
                }
                //找到了相等的节点
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }
        //如果有找到相等的节点，那么e保存的就是这个节点的引用，直接替换value即可
        if (e != null) { // existing mapping for key
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            afterNodeAccess(e);
            return oldValue;
        }
    }
    ++modCount;
    //加入这个节点后超过了threshold，那么resize
    if (++size > threshold)
        resize();
    afterNodeInsertion(evict);
    return null;
}
```

#### 3.3.2. 第一次进来table肯定为空，那么扩容
- resize方法
```java
final Node<K,V>[] resize() {
	//保存旧的table，capacity，threshold
    Node<K,V>[] oldTab = table;
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    int oldThr = threshold;
    //新的capacity和threshold初始化为0
    int newCap, newThr = 0;
    if (oldCap > 0) {
    	//旧的capacity比int MAXIMUM_CAPACITY = 1 << 30还要大，那么更新threshold为Integer.MAX_VALUE，并且直接返回旧的table（即不进行扩容）
        if (oldCap >= MAXIMUM_CAPACITY) {
            threshold = Integer.MAX_VALUE;
            return oldTab;
        }
        //新的capacity为旧的capacity的两倍（即新的capacity为16*2=32）
        //如果32 < MAXIMUM_CAPACITY 并且 oldCap >= DEFAULT_INITIAL_CAPACITY
        else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY &&
                 oldCap >= DEFAULT_INITIAL_CAPACITY)
         	//则把threshold也更新为旧的2倍（即新的threshold为12*2=24）
            newThr = oldThr << 1; // double threshold
    }
    //新的capacity就为threshold
    else if (oldThr > 0) // initial capacity was placed in threshold
        newCap = oldThr;
    //第一次初始化。
    else { // zero initial threshold signifies using defaults
        newCap = DEFAULT_INITIAL_CAPACITY;
        newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY);
    }
    if (newThr == 0) {
        float ft = (float)newCap * loadFactor;
        newThr = (newCap < MAXIMUM_CAPACITY && ft < (float)MAXIMUM_CAPACITY ?
                  (int)ft : Integer.MAX_VALUE);
    }
    threshold = newThr;
    @SuppressWarnings({"rawtypes","unchecked"})
    //创建新的table，大小为newCapacity
    Node<K,V>[] newTab = (Node<K,V>[])new Node[newCap];
    table = newTab;
    if (oldTab != null) {
    	//遍历旧table中的每一个链表
        for (int j = 0; j < oldCap; ++j) {
            Node<K,V> e;
            if ((e = oldTab[j]) != null) {
                //置为null让gc及时回收，当然oldTab[j]已经保存到局部变量e中了
                oldTab[j] = null;
                //第一种情况：如果链表中只有一个节点
                if (e.next == null)
                	//那么重新计算位置（e.hash & (newCap  1)），并放入新的table
                    newTab[e.hash & (newCap  1)] = e;
                //第二种情况：链表中有多个节点，同时第一个节点为TreeNode，那么转调树的操作
                else if (e instanceof TreeNode)
                    ((TreeNode<K,V>)e).split(this, newTab, j, oldCap);
                //第三种情况：链表中有多个节点，且是普通链表
                else { // preserve order
                    //旧table的链表，rehash后在新table中的位置
                        //要么跟旧table中的位置一样-----------（1）
                        //要么是旧table中的位置+oldCap-------（2）
                    //其实就是把原来的链表分成两部分，所以
                        //loXXX代表（1）
                        //hiXXX代表（2）
                    Node<K,V> loHead = null, loTail = null;

                    Node<K,V> hiHead = null, hiTail = null;
                    Node<K,V> next;
                    do {
                        next = e.next;
                      	//高位是0，那么这个元素在新table中的位置跟在旧table一样
                        if ((e.hash & oldCap) == 0) {
                            if (loTail == null)
                                loHead = e;
                            else
                                loTail.next = e;
                            loTail = e;
                        }
                        //高位是1，那么这个元素在新table中的位置是旧table的位置+oldCap
                        else {
                            if (hiTail == null)
                                hiHead = e;
                            else
                                hiTail.next = e;
                            hiTail = e;
                        }
                    } while ((e = next) != null);
                    //上面的循环把链表瓜分完了，下面开始赋值到新table了
                    if (loTail != null) {
                        loTail.next = null;
                        //（1）
                        newTab[j] = loHead;
                    }
                    if (hiTail != null) {
                        hiTail.next = null;
                        //（2）
                        newTab[j + oldCap] = hiHead;
                    }
                }
            }
        }
    }
    return newTab;
}
```

#### 3.3.3. 使用hash值&数组长度1计算改数据存放的位置i

```java
i = (n  1) & hash
```



#### 3.3.4. 第二次进来如果位置i为空，那么用（key，value）存入该位置

```java
//使用hash至以及数组长度计算下标，如果table[下标]为空，即没有元素，直接赋值即可
if ((p = tab[i = (n  1) & hash]) == null)
    tab[i] = newNode(hash, key, value, null);

```

#### 3.3.5. 第三次进来如果位置i不为空，那么遍历链表或红黑树找到key相等的节点替换value

```java
//否则说明table[下标]有元素
else {
    Node<K,V> e; K k;
    //头节点不仅hash值相同，key也equals（即头节点就是要找的节点），那么保存这个节点以便后续使用
    if (p.hash == hash &&
        ((k = p.key) == key || (key != null && key.equals(k))))
        e = p;
    //头节点不是要找的节点，同时是个TreeNode，那么转调tree的操作
    else if (p instanceof TreeNode)
        e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
    //头节点不是要找的节点，同时是普通的链表
    else {
    	//遍历链表找，同时记录遍历了几个元素存到bitCount里。
        for (int binCount = 0; ; ++binCount) {
        	//到达链表的尾部
            if ((e = p.next) == null) {
                p.next = newNode(hash, key, value, null);
                //判断bitCount是否达到树化的限度，是则树化
                //这里binCount为TREEIFY_THRESHOLD - 1，也就是7的时候
                //也就是这个链表中的节点（不包括头节点）个数为8的时候
                if (binCount >= TREEIFY_THRESHOLD - 1) // 1 for 1st
                    treeifyBin(tab, hash);
                break;
            }
            //找到了相等的节点
            if (e.hash == hash &&
                ((k = e.key) == key || (key != null && key.equals(k))))
                break;
            p = e;
        }
    }
    //如果有找到相等的节点，那么e保存的就是这个节点的引用，直接替换value即可
    if (e != null) { // existing mapping for key
        V oldValue = e.value;
        if (!onlyIfAbsent || oldValue == null)
            e.value = value;
        afterNodeAccess(e);
        return oldValue;
    }
}
```

##### 3.3.5.1. 怎么转换成红黑树的

- treeifyBin

```java
final void treeifyBin(Node<K,V>[] tab, int hash) {
    int n, index; Node<K,V> e;
    //这里table的长度<64的时候并不进行树化，而是进行扩容
    //也就是说链表转换成红黑树的条件是 链表中元素个数为8个 并且 table长度为64
    if (tab == null || (n = tab.length) < MIN_TREEIFY_CAPACITY)//MIN_TREEIFY_CAPACITY是64
        resize();
    //下面的操作是把链表中的节点（Node）转换成树中的节点（TreeNode）
    else if ((e = tab[index = (n - 1) & hash]) != null) {
        TreeNode<K,V> hd = null, tl = null;
        //这个循环遍历链表
        do {
            //传入链表中的当前节点以及下一个节点，转换成TreeNode
            TreeNode<K,V> p = replacementTreeNode(e, null);
            //tail为空，就是说现在是树中的第一个元素
            if (tl == null)
                //那么同时得初始化head为当前节点
                hd = p;
            //不是树中的第一个元素，那么插入到树的末尾
            else {
                //这里的树节点怎么感觉像是个双向链表？？？
                p.prev = tl;
                tl.next = p;
            }
            tl = p;
        } while ((e = e.next) != null);
        if ((tab[index] = hd) != null)
            //上面仅是构造了TreeNode为节点的双向链表，这里才是真正的树化操作
            hd.treeify(tab);
    }
}

```

###### 3.3.5.1.1. Node->TreeNode

- replacementTreeNode

```java
TreeNode<K,V> replacementTreeNode(Node<K,V> p, Node<K,V> next) {
    //就是把当前节点的hash、key、value初始化成TreeNode的hash、key、value
    //把下一个节点初始化为TreeNode.next
    return new TreeNode<>(p.hash, p.key, p.value, next);
}
    
```

- TreeNode

```java
static final class TreeNode<K,V> extends LinkedHashMap.Entry<K,V> {
    TreeNode<K,V> parent;  // red-black tree links
    TreeNode<K,V> left;
    TreeNode<K,V> right;
    TreeNode<K,V> prev;    // needed to unlink next upon deletion
    boolean red;
    //这个构造方法其实就是HashMap的Node的构造方法，没什么特殊的
    TreeNode(int hash, K key, V val, Node<K,V> next) {
    //LinkedHashMap.Entry
        super(hash, key, val, next);
    }

```

- LinkedHashMap.Entry

```java
static class Entry<K,V> extends HashMap.Node<K,V> {
    Entry<K,V> before, after;
    Entry(int hash, K key, V value, Node<K,V> next) {
    //HashMap.Node
        super(hash, key, value, next);
    }
}
```

- HashMap.Node

```java
static class Node<K,V> implements Map.Entry<K,V> {
    final int hash;
    final K key;
    V value;
    Node<K,V> next;

    Node(int hash, K key, V value, Node<K,V> next) {
        this.hash = hash;
        this.key = key;
        this.value = value;
        this.next = next;
    }

```

###### 3.3.5.1.2. 树化
- treeify

有点复杂，暂时飘过。。。

```java
final void treeify(Node<K,V>[] tab) {
    TreeNode<K,V> root = null;
    for (TreeNode<K,V> x = this, next; x != null; x = next) {
        next = (TreeNode<K,V>)x.next;
        x.left = x.right = null;
        if (root == null) {
            x.parent = null;
            x.red = false;
            root = x;
        }
        else {
            K k = x.key;
            int h = x.hash;
            Class<?> kc = null;
            for (TreeNode<K,V> p = root;;) {
                int dir, ph;
                K pk = p.key;
                if ((ph = p.hash) > h)
                    dir = -1;
                else if (ph < h)
                    dir = 1;
                else if ((kc == null &&
                          (kc = comparableClassFor(k)) == null) ||
                         (dir = compareComparables(kc, k, pk)) == 0)
                    dir = tieBreakOrder(k, pk);

                TreeNode<K,V> xp = p;
                if ((p = (dir <= 0) ? p.left : p.right) == null) {
                    x.parent = xp;
                    if (dir <= 0)
                        xp.left = x;
                    else
                        xp.right = x;
                    root = balanceInsertion(root, x);
                    break;
                }
            }
        }
    }
    moveRootToFront(tab, root);
}
```

### 3.4. get方法

总体伪算法如下：

- 计算key的hash值
- 使用hash值&数组长度1计算改数据存放的位置i
    - 如果位置i不为空，那么比较key是否相等，是则返回
        - 否则如果是树，转调红黑树的查询
        - 如果是链表，遍历链表查找key相等的node
    - 否则直接返回null
```java
public V get(Object key) {
    Node<K,V> e;
    //通过key的hash值+key本身寻找node
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}
```

#### 3.4.1. 计算key的hash值
- hash

```java
//hash函数
static final int hash(Object key) {
    int h;
    //hashCode 异或 hashCode 右移16bit
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}


```

- getNode方法
```java
final Node<K,V> getNode(int hash, Object key) {
    Node<K,V>[] tab; Node<K,V> first, e; int n; K k;
    //通过hash&(table长度1)计算下标
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (first = tab[(n  1) & hash]) != null) {
        //找到了：当前节点与table[下标]相等hash相等且key相等
        if (first.hash == hash && // always check first node
            ((k = first.key) == key || (key != null && key.equals(k))))
            return first;
        //继续寻找
        if ((e = first.next) != null) {
        	//TreeNode，转调树
            if (first instanceof TreeNode)
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);
            do {
            	//遍历链表寻找相等的节点
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null);
        }
    }
    return null;
}
```


#### 3.4.2. 使用hash值&数组长度1计算改数据存放的位置i

```java
i = (n  1) & hash
```


#### 3.4.3. 第一个节点就是要找的节点

```java
if ((tab = table) != null && (n = tab.length) > 0 &&
    (first = tab[(n  1) & hash]) != null) {
    //找到了：当前节点与table[下标]相等hash相等且key相等
    if (first.hash == hash && // always check first node
        ((k = first.key) == key || (key != null && key.equals(k))))
        return first;
```


#### 3.4.4. 转调树或红黑树的查找操作找到节点

```java
 //继续寻找
if ((e = first.next) != null) {
	//TreeNode，转调树
    if (first instanceof TreeNode)
        return ((TreeNode<K,V>)first).getTreeNode(hash, key);
    do {
    	//遍历链表寻找相等的节点
        if (e.hash == hash &&
            ((k = e.key) == key || (key != null && key.equals(k))))
            return e;
    } while ((e = e.next) != null);
}
```

#### 3.4.5. 没有找到返回null
```java
return null;
```

### 3.5. containsKey方法

```java
public boolean containsKey(Object key) {
    //也是调用的getNode方法判断是否为空
    return getNode(hash(key), key) != null;
}
```


### 3.6. remove方法

总体伪算法如下：

- 计算key的hash值
- 使用hash值&数组长度1计算改数据存放的位置i
- 如果位置i不为空，对比key是否相等，相等则改变头节点指向下一个
- 否则
    - 如果是树节点，转调红黑树的删除接口
    - 如果是链表节点，遍历链表找到key相等的节点，把前一个节点的next指向该节点的next

- remove
```java
public V remove(Object key) {
    Node<K,V> e;
    return (e = removeNode(hash(key), key, null, false, true)) == null ?
        null : e.value;
}
```
#### 3.6.1. 计算key的hash值
- hash

```java
//hash函数
static final int hash(Object key) {
    int h;
    //hashCode 异或 hashCode 右移16bit
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}


```


- removeNode方法

```java
final Node<K,V> removeNode(int hash, Object key, Object value,
                           boolean matchValue, boolean movable) {
    Node<K,V>[] tab; Node<K,V> p; int n, index;
    if ((tab = table) != null && (n = tab.length) > 0 &&
    	//计算第一个节点的位置
        (p = tab[index = (n  1) & hash]) != null) {
        Node<K,V> node = null, e; K k; V v;
        //第一个节点就是要找的节点
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            node = p;
        //不是则继续寻找
        else if ((e = p.next) != null) {
        	//是个TreeNode，转调树
            if (p instanceof TreeNode)
                node = ((TreeNode<K,V>)p).getTreeNode(hash, key);
            //遍历链表直到找到相等的节点
            else {
                do {
                    if (e.hash == hash &&
                        ((k = e.key) == key ||
                         (key != null && key.equals(k)))) {
                        node = e;
                        break;
                    }
                    p = e;
                } while ((e = e.next) != null);
            }
        }
        //有找到节点
        if (node != null && (!matchValue || (v = node.value) == value ||
                             (value != null && value.equals(v)))) {
            //转调树
            if (node instanceof TreeNode)
                ((TreeNode<K,V>)node).removeTreeNode(this, tab, movable);
            //链表的第一个元素
            else if (node == p)
                tab[index] = node.next;
            //链表的非第一个元素
            else
                p.next = node.next;
            ++modCount;
            size;
            afterNodeRemoval(node);
            return node;
        }
    }
    return null;
}

```

#### 3.6.2. 使用hash值&数组长度1计算改数据存放的位置i

```java
i = (n  1) & hash
```


#### 3.6.3. 调用链表或是红黑树的查找操作找到key相等的节点

```java
Node<K,V>[] tab; Node<K,V> p; int n, index;
    if ((tab = table) != null && (n = tab.length) > 0 &&
    	//计算第一个节点的位置
        (p = tab[index = (n  1) & hash]) != null) {
        Node<K,V> node = null, e; K k; V v;
        //第一个节点就是要找的节点
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            node = p;
        //不是则继续寻找
        else if ((e = p.next) != null) {
        	//是个TreeNode，转调树
            if (p instanceof TreeNode)
                node = ((TreeNode<K,V>)p).getTreeNode(hash, key);
            //遍历链表直到找到相等的节点
            else {
                do {
                    if (e.hash == hash &&
                        ((k = e.key) == key ||
                         (key != null && key.equals(k)))) {
                        node = e;
                        break;
                    }
                    p = e;
                } while ((e = e.next) != null);
            }
        }
```

#### 3.6.4. 调用链表或红黑树的删除操作

```java
//有找到节点
if (node != null && (!matchValue || (v = node.value) == value ||
                     (value != null && value.equals(v)))) {
    //转调树
    if (node instanceof TreeNode)
        ((TreeNode<K,V>)node).removeTreeNode(this, tab, movable);
    //链表的第一个元素
    else if (node == p)
        tab[index] = node.next;
    //链表的非第一个元素
    else
        p.next = node.next;
    ++modCount;
    size;
    afterNodeRemoval(node);
    return node;
}
```

### 3.7. containsValue

- 效率O（N²）
```java
public boolean containsValue(Object value) {
Node<K,V>[] tab; V v;
if ((tab = table) != null && size > 0) {
	//遍历数组的每个元素
    for (int i = 0; i < tab.length; ++i) {
    	//链表的每个元素
        for (Node<K,V> e = tab[i]; e != null; e = e.next) {
            if ((v = e.value) == value ||
                (value != null && value.equals(v)))
                return true;
        }
    }
}
return false;
}
```


## 4. 问题


### 4.1. 相对于JDK1.7的区别
- 使用了红黑树
因此JDK1.8的内部实现是数组+链表+红黑树
1.8之前是数组+链表实现的。对于一个key，先计算其Hash值再对数组大小取模决定放在那个元素上，再通过连地址法解决冲突
如果很多key映射到同一个元素上，那么效率退化成O（N），因此1.8在链表超过阈值的时候会转成红黑树，效率为O（logN）
- 解决了并发resize时的死循环问题
保留了顺序，使用的尾插法而不是头插法

### 4.2. 如何解决并发resize时的死循环问题
保留了顺序，把头插法改成了尾插法


### 4.3. 什么时候扩容
size>容量*负载因子


### 4.4. 怎么扩容的
参考
> 3.3.2. 第一次进来table肯定为空，那么扩容