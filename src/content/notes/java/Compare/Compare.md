---
title: "14.Compare"
description: "1. Compare是什么 用于排序、分组的一个接口 2. 使用 2.1. 自定义Comparator 我们可以自定义Comparator并实现compare方法。 - compare方法有两个参数（o1，o2），表示相邻的两个元素； - 如果compare方法返回负数，表明o1应该排在o2前面； "
sourcePath: "Java/Compare/Compare.md"
category: "java"
categoryLabel: "Java"
topic: "Compare"
topicLabel: "14.Compare"
order: 232
tags: ["Java"]
createdAt: "2020-03-07T03:29:12Z"
updatedAt: "2020-03-07T04:54:14Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. Compare是什么
用于排序、分组的一个接口

## 2. 使用

### 2.1. 自定义Comparator

```java
public class ComparatorTest
{
    private int val;

    public ComparatorTest(int val)
    {
        this.val = val;
    }

    @Override
    public String toString()
    {
        return String.format("hashcode=%s, val=%d", this.hashCode(), val);
    }

    private static class MyComparator implements Comparator<ComparatorTest>
    {
        @Override
        public int compare(ComparatorTest o1, ComparatorTest o2)
        {
            //返回负数的话说明o1<o2，那么o1排在o2前面
            //返回正数的话说明o1>o2，那么o1排在o2后面
            //返回0的话说明o1==o2，那么位置不变
            return o1.val - o2.val;
        }
    }

    public static void main(String[] args)
    {
        List<ComparatorTest> list = new ArrayList<>();
        list.add(new ComparatorTest(10));
        list.add(new ComparatorTest(9));
        list.add(new ComparatorTest(9));

        System.out.println(list);//[Addrress=460141958, val=10, Addrress=2125039532, val=9, Addrress=312714112, val=9]

        Collections.sort(list, new MyComparator());

        System.out.println(list);//[Addrress=2125039532, val=9, Addrress=312714112, val=9, Addrress=460141958, val=10]

    }
}

```


我们可以自定义Comparator并实现compare方法。

- compare方法有两个参数（o1，o2），表示相邻的两个元素；
    - 如果compare方法返回负数，表明o1应该排在o2前面；
    - 如果compare方法返回真数，表明o1应该排在o2后面；
    - 如果compare方法返回0，表明o1、o2顺序不变；

如下图示：

- `return o1.val - o2.val`
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200307124806.png)
- `return o2.val - o1.val`
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200307125345.png)

### 2.2. 实现Comparable接口

```java
public class ComprableTest implements Comparable<ComprableTest>
{

    private int val;

    public ComprableTest(int val)
    {
        this.val = val;
    }

    @Override
    public String toString()
    {
        return String.format("hashcode=%s, val=%d", this.hashCode(), val);
    }

    @Override
    public int compareTo(ComprableTest o)
    {
        //返回负数的话说明o1<o2，那么o1排在o2前面
        //返回正数的话说明o1>o2，那么o1排在o2后面
        //返回0的话说明o1==o2，那么位置不变
        return this.val - o.val;
    }

    public static void main(String[] args)
    {
        List<ComprableTest> list = new ArrayList<>();
        list.add(new ComprableTest(10));
        list.add(new ComprableTest(9));
        list.add(new ComprableTest(9));

        System.out.println(list);//[Addrress=460141958, val=10, Addrress=2125039532, val=9, Addrress=312714112, val=9]

        Collections.sort(list);

        System.out.println(list);//[Addrress=2125039532, val=9, Addrress=312714112, val=9, Addrress=460141958, val=10]
    }
}


```

## 3. 参考
- [【java】Comparator的用法\_Java\_峰峯的专栏\-CSDN博客](https://blog.csdn.net/u012250875/article/details/55126531)
- [Java的Comparator升序降序的记法 \- 知乎](https://zhuanlan.zhihu.com/p/54004622)
