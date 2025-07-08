[toc]

## 1. InnoDB
- MySQL默认的存储引擎
- InnoDB把数据分成若干页，每个页大小16KB，以页作为磁盘和内存交互的基本单位
    - 即读最少读一页，写最少写一页


### 1.1. 索引实现
#### 1.1.1. 主键索引
- 叶子节点的data存放的就是实际的数据
    - ![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229200508.png)
- 由于索引上面存放的是实际的数据，所以只有一个ibd文件
    - ![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229200458.png)
#### 1.1.2. 辅助索引
叶子节点的data存放的是主键索引

## 2. MyISAM
- 与InnoDB的区别在于索引和数据是分开的
    - 数据文件：行号-记录
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1620190912_20210505125903712_20749.png)
    - 索引文件：索引-行号
- 相当于MyISAM都是二级索引


![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229200541.png)
如图由于索引和数据分离，所以有MYD和MYI文件

### 2.1. 索引实现


#### 2.1.1. 主键索引
叶子节点的data存放的是数据的地址
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229200550.png)

#### 2.1.2. 辅助索引
跟主键索引一样，叶子节点的data存放的是数据的地址
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229200600.png)



