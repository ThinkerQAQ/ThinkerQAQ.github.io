[toc]


## 1. 倒排索引是什么
- [倒排索引.md](../../Algorithm/数据结构/倒排索引.md)
## 2. Elasticsearch的倒排索引工作原理

比如两个文档
```
1 Mother loves father
2 He likes dogs
```
搜索Father likes cat
### 2.1. 建立索引
1. 首先是分词
```
Mother
loves
father
He
likes
dogs
```
2. 然后是normalization：就是把语态、单复数等的转换
```
mother
love
father
he
like
dog
```

3. 最后记录词和文档的关系
```
mother 1
love 1
father 1
he    2
like    2
dog      2
```

### 2.2. 搜索
1. 首先是分词
```
Father
likes
cat
```
2. 然后是normalization：就是把语态、单复数等的转换
```
father
like
cat
```
3. 最后匹配映射关系：两个文档都会出来

## 3. 参考

- [倒排索引为什么叫倒排索引？ \- 知乎](https://www.zhihu.com/question/23202010)
- [倒排索引原理和实现\_搜索引擎,数据结构,搜索\_Soul Joy Hub\-CSDN博客](https://blog.csdn.net/u011239443/article/details/60604017)

