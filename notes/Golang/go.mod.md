## 1. 使用
### 1.1. 查询某个包是谁引入的

```sh
go mod graph | grep -i "code.byted.org/overpass/common@v0.0.0-20221129060123-7d175d3c0ba8"
```



```sh
go mod why "xxx"
```
## 2. 参考
- [【Go 专家编程】go\.mod 文件中的indirect准确含义 \- 恋恋美食的个人空间 \- OSCHINA \- 中文开源技术交流社区](https://my.oschina.net/renhc/blog/3162751)
- [两个生僻小命令\-\-\-go mod why和go mod graph \| 清澄秋爽](https://dashen.tech/2019/10/29/%E4%B8%A4%E4%B8%AA%E7%94%9F%E5%83%BB%E5%B0%8F%E5%91%BD%E4%BB%A4-go-mod-why%E5%92%8Cgo-mod-graph/)
- [PaulXu\-cn/go\-mod\-graph\-chart: Draw graphs through GO MOD GRAPH output](https://github.com/PaulXu-cn/go-mod-graph-chart)
- [xingliuhua/gramod: go mod graph tool（强大的go mod 图形化工具）](https://github.com/xingliuhua/gramod)