
## 1. DOT语言
### 1.1. 三要素
- 图
    - 使用`graph`或者`digraph`定义
- 节点
    - 一个变量名就是一个node
- 边
    - 使用`--`或者`->`定义
### 1.2. 注释
- 使用`//`或者`/**/`
### 1.3. 语句
- 语句之间使用`;`分割
### 1.4. 属性
- 使用`[key=value, key1=value1, key3="value3, value4"]`

## 2. 图
### 2.1. 定义
#### 2.1.1. 有向图
```dot
//无向图
graph simple {
    a--b--c;
    b--d;
}
```

#### 2.1.2. 无向图
```dot
//有向图
digraph simple {
    a->b->c;
    b->d;
}
```
### 2.2. 图的属性
```dot
digraph graph_attr {
    graph [bgcolor = "#666666",
    fontname="Futura", fontcolor = white, fontsize = 24,
    labelloc = t, labeljust = c]

    label = "Graphviz\n关系图脚本绘制工具"
    node0->node1;
}
```

### 2.3. 子图
- 使用`subgraph`定义，名字为`cluster_xxx`
- 子图继承父图的属性，但可以对其进行重定义覆盖，范围仅限于该子图，不会对父图或兄弟图进行污染
- Graphviz中，关系只存在节点之间，不存在节点与子图，子图和子图的关系；要解决这个问题，可以将上层的compound设置为true，然后通过将边属性中的lhead和ltail设定为相应的子图来建立

```dot
digraph g {
    graph[compound=true]
    node1->a;
    
    subgraph cluster_c1 {
        a->b;
    }
    subgraph cluster_c2 {
        c->d;
    }
    
    edge [dir=none]
    node1->c[lhead=cluster_c2, label="test"];
}
```

## 3. 节点

### 3.1. 定义
#### 3.1.1. 普通节点
```dot
digraph node_define {
    name1;
    name2;
}
```

#### 3.1.2. 表格节点
```dot
digraph g {
    node [shape=record, width=.1, height=.1];
    
    //左边的node，有两个域，定义了field id
    node0[label="<f0> \<=333|<f1> \>333"]
    //右边的node，有三个域，定义了field id
    node1 [label="{<n> 111|222|<p> 333}"]
    node2 [label="{<n> 444|555|<p> 666}"]

    node0:f0->node1:n;
    node0:f1->node2:p;
}
```

### 3.2. 节点属性

#### 3.2.1. 全局
```dot
digraph node_attr {
    node[shape=box, label="test"]
    a1->a2;
}
```

#### 3.2.2. 局部
```dot
digraph node_attr {
    shape1 [shape=box, label="shape1" style="filled", fillcolor="#73819F"];
    shape2 [shape=box, label="shape2"];
    shape1->shape2;
}
```
### 3.3. 端点
- 节点有 8 个端口可以用于连接： "n", "ne", "e", "se", "s", "sw", "w" 和 "nw"
```dot
digraph graphNodePorts {
  a -> b [tailport=w];
  c:sw -> b:e;
}
```


```dot
graph g {
    a--b;
    a--c;
}
```
## 4. 连线

### 4.1. 定义
#### 4.1.1. 有向
```dot
digraph g {
    a->b;
    b->c;
}
```

#### 4.1.2. 无向
```dot
graph g {
    a--b;
    b--c;
}
```
### 4.2. 连线属性
#### 4.2.1. 全局
```dot
digraph edge_attr{
    edge[style="bold solid", color="red", label="加粗红色"]
    a1->a2;
}
```

#### 4.2.2. 局部
```dot
digraph edge_attr {
    style0->style1[style=solid, label="实线"]
    style1->style2[style=bold, label="实线"]
}
```

## 5. 例子

### 5.1. binary search tree
```dot
digraph g {
    node [shape=record, height=.1];
    node0[label="<f0> |<f1> 1 |<f2> "];
    node1[label="<f0> |<f1> 2 |<f2> "];
    node2[label="<f0> |<f1> 3 |<f2> "];
    node3[label="<f0> |<f1> 4 |<f2> "];
    node4[label="<f0> |<f1> 5 |<f2> "];
    node0:f0 -> node1:f1;
    node0:f2 -> node2:f2;
    node2:f0 -> node3:f2;
    node2:f2 -> node4:f2;
}
```
### 5.2. hash table
```dot
digraph G {
    //间距
    nodesep=.05;
    //左右排序
    rankdir=LR;
    //设置节点属性
    node [shape=record, width=.1, height=.1];
    
    //左边的node，有两个域，定义了field id
    node0[label="<f0>|<f1>"]
    //右边的node，有三个域，定义了field id
    node1 [label="{<n> 111|222|<p> 333}"]
    node2 [label="{<n> 444|555|<p> 666}"]

    node0:f0->node1:n;
    node0:f1->node2:p;
}
```

### 5.3. 人脸识别
```dot
strict digraph g1 {
    //图的属性
    graph [bgcolor = "white", fontname="微软雅黑", 
        fontcolor = black, fontsize = 18, splines=false,
        nodesep=1.5, ranksep=1.5, rankdir=TB, label="人脸识别"];
    //节点的属性
    node[fontname="微软雅黑", fontsize = 18, 
        shape="box", style="rounded"]
    //边的属性
    edge[fontname="微软雅黑", fontsize = 12]

    //子图：用于定义节点以及占位布局
    subgraph cluster_level {
        graph[label="层次"];
        node [shape=plaintext, fontname="微软雅黑", fontsize=16];
        edge [style=invis];
        //定义节点
        l1[label="client层"];
        l2[label="server层"];
        l3[label="basic_server层"];
        l4[label="storage层"];
        //连线
        l1 -> l2 -> l3 -> l4;
    }

    subgraph cluster_txy {
        graph[label="腾讯云"];
        //定义节点
        n5[label="人脸核身\n服务"];
        node [shape=plaintext, fontname="微软雅黑", fontsize=16];
        edge [style=invis];
        t1[label=""];
        t2[label=""];
        t3[label=""];
        //连线
        t1->n5->t2->t3;
    }

    subgraph cluster_txzb {
        graph[label="腾讯直播"];
        //定义节点
        n1[label="腾讯直播\nAPP"]
        n2[label="Nest管理\n平台"]
        n3[label="实名认证\n服务"]
        n4[label="实名认证后台\n管理服务"]
        n6[label="中台实名\n服务"]
        n7[label="MySQL"]
        //连线
        n1->n3[label="1 获取启动人脸核身SDK的参数\n4 服务端校验人脸核身结果"];
        n1->n5[label="3 启动SDK上传姓名+身份证+人脸数据"];
        n3->n5[label="2 获取启动人脸核身SDK的参数\n5 查询人脸核身结果"];
        n3->n6[label="7 认证成功那么更新实名信息"];
        n3->n7[label="6 将实名信息写入数据库"];
        n2->n4[label="1 人工审核通过/不通过"];
        n4->n6[label="2 审核通过那么更新实名信息"];
        n4->n7[label="3 更新数据库"];
    }


    //分组：同一行
    {rank = same; l1;t1;n1;n2;}
    {rank = same; l2;n3;n4;n5;}
    {rank = same; l3;t2;n6;}
    {rank = same; l4;t3;n7;}


}
```

### 5.4. 通用

```dot
strict digraph g1{
    //图的属性
    graph [fontname="微软雅黑", fontsize = 18, splines=false,
        nodesep=1.5, ranksep=1.5,  label="Test"];
    //节点的属性
    node[fontname="微软雅黑", fontsize = 18, 
        shape="box", style="rounded"]
    //边的属性
    edge[fontname="微软雅黑", fontsize = 12]

    //子图：逻辑分组或者说连线分组
    subgraph cluster_level {
        graph[label="Level"];
        node [shape=plaintext];
        edge [style=invis];
        
        l1[label="client层"];
        l2[label="service层"];
        l3[label="basic_service层"];
        l4[label="storage层"];
        l1->l2->l3->l4;
    }
    subgraph cluster_outer {
        graph[label="Outer"];
        edge [style=invis];

        o1[label="",shape=plaintext];
        o2[label="外部服务"];
        o3[label="",shape=plaintext];
        o4[label="",shape=plaintext];
        o1->o2->o3->o4;
    }
    subgraph cluster_inner {
        graph[label="Inner"];

        i1[label="client1"];
        i2[label="client2"];
        i3[label="聚合服务1"];
        i4[label="聚合服务2"];
        i5[label="基础服务"];
        i6[label="存储"];
        i1->o2;
        i1->i3->{i5,i6,o2};
        i2->i4->{i5,i6};
    }
    //布局：同一行
    {rank=same;l1;o1;i1;i2;}
    {rank=same;l2;o2;i3;i4;}
    {rank=same;l3;o3;i5;}
    {rank=same;l4;o4;i6;}
    
}
```
## 6. 参考
- [开源项目：【自动】绘图工具 Graphviz——《太子党关系网络》就是用它制作 @ 编程随想的博客](https://program-think.blogspot.com/2016/02/opensource-review-graphviz.html#head-5)
- [Data Structures](https://graphviz.org/Gallery/directed/datastruct.html)
- [使用 dot 画图工具](https://jeanhwea.github.io/article/drawing-graphs-with-dot.html)
- [程序员如何更好的表达自己的想法\- Graphviz:关系图脚本绘制工具](https://stidio.github.io/2017/07/how_do_programmer_express_yourself_better-graphviz/)
- [Documentation](https://graphviz.org/documentation/)
- [用Graphviz自动布局各种图 \| 陈颂光](https://www.chungkwong.cc/dot.html)

