[toc]

## 1. SQL注入攻击是什么
一种Web攻击
SQL注入是一种将SQL代码添加到输入参数中，传递到服务器解析并执行的一种攻击手法。


## 2. 为什么会发生SQL注入攻击

把用户输入的违法字符拼接到SQL语句中执行

## 3. 如何解决SQL注入攻击
### 3.1. 开启SQL预编译
1. 写SQL的时候参数用`?`占位
2. 服务端开启SQL预编译功能。开启了SQL预编译语法树已经不能改变了，换句话说用户的输入只能当作数据而不是指令。
SQL语句在程序运行前已经进行了预编译，在程序运行时第一次操作数据库之前，SQL语句已经被数据库分析，编译和优化，对应的执行计划也会缓存下来并允许数据库已参数化的形式进行查询，当运行时动态地把参数传给PreprareStatement时，即使参数里有敏感字符如`or '1=1`，数据库也会作为一个参数一个字段的属性值来处理而不会作为一个SQL指令，如此，就起到了SQL注入的作用了！

## 4. 实例

### 4.1. Golang

[sql.md](../Golang/sql.md)

## 5. 参考
- [SQL注入攻击常见方式及测试方法\_Lambda\_Y的博客\-CSDN博客](https://blog.csdn.net/github_36032947/article/details/78442189)
- [sunwu51/WebSecurity](https://github.com/sunwu51/WebSecurity)
- [数据库预编译为什么能防止SQL注入呢？\_weixin\_45179130的博客\-CSDN博客\_预编译防止sql注入](https://blog.csdn.net/weixin_45179130/article/details/90761966)
- [Mysql读写分离\+防止sql注入攻击「GO源码剖析」 \- 知乎](https://zhuanlan.zhihu.com/p/111682902)