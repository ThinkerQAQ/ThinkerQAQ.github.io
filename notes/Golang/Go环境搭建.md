
## 1. 安装Golang
### 1.1. 下载
- [Downloads \- The Go Programming Language](https://golang.org/dl/)
### 1.2. 配置环境变量
Windows直接右键计算机修改环境变量，重启生效
Linux一般修改/etc/profile，然后source /etc/profile生效
新版本的golang可以用`go env -w 变量名=""`来设置环境变量，存储于`C:\Users\%USER%\AppData\Roaming\go\env`
#### 1.2.1. GOROOT
安装的根目录，默认已设置，不用配置

重要的有以下目录

- bin目录
![](https://raw.githubusercontent.com/TDoct/images/master/1598069007_20200822120024616_30961.png)
- pkg目录
![](https://raw.githubusercontent.com/TDoct/images/master/1598069009_20200822120039071_9258.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1598069010_20200822120122830_21975.png)
- src目录
![](https://raw.githubusercontent.com/TDoct/images/master/1598069011_20200822120145909_20469.png)
#### 1.2.2. GOPATH
提供一个可以寻找 .go 源码的路径，它是一个工作空间的概念，可以设置多个目录。
需要包含三个文件夹
```
src #存放源文件
pkg #存放源文件编译后的库文件，后缀为 .a
bin #存放可执行文件
```
#### 1.2.3. GOBIN
go install编译生成的可执行文件存放的位置，一般不用配置，默认为GOPATH/bin


![](https://raw.githubusercontent.com/TDoct/images/master/1587803942_20200425163852285_17674.png)
#### 1.2.4. GOPROXY+GOPRIVATE
[GOPROXY\.IO \- 一个全球代理 为 Go 模块而生](https://goproxy.io/zh/)

### 1.3. 查看环境变量
`go env`查看配置的环境变量是否正确
![](https://raw.githubusercontent.com/TDoct/images/master/1645500717_20220222113140666_148.png)
## 2. Go常用命令
### 2.1. go build
用来编译指定 packages 里的源码文件以及它们的依赖包，编译的时候会到 `$GOPATH/src/package` 路径下寻找源码文件
### 2.2. go install

用于编译并安装指定的代码包及它们的依赖包。相比 go build，它只是多了一个“安装编译后的结果文件到指定目录”的步骤。
### 2.3. go run
编译并运行命令源码文件
### 2.4. go tool compile
`go tool compile -S xxx.go` 生成asm
## 3. Git配置
[git.md](../Others/软件/git.md)
## 4. vscode
### 4.1. 远程开发
1. vim ~/.ssh/config
```ssh
Host DEVCLOUD
   HostName 服务器IP
   User zsk
   Port 服务器端口
   IdentityFile C:\Users\zsk\.ssh\zsk_rsa
```

2. 服务器免密登录
[SSH 三步解决免密登录\_jeikerxiao\-CSDN博客\_ssh 免密登陆](https://blog.csdn.net/jeikerxiao/article/details/84105529)
3. ![](https://raw.githubusercontent.com/TDoct/images/master/1645502167_20220222115600063_11041.png)

## 5. Goland
### 5.1. 代码格式化
- 单行限制

    - ![](https://raw.githubusercontent.com/TDoct/images/master/1600872530_20200923224833126_3908.png)
- 导入包排序
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1600872533_20200923224839711_31705.png)
- 注释空格
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1600872536_20200923224843131_26639.png)
- 格式化代码
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1600872538_20200923224846838_4547.png)
- 检查问题
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1618931220_20210420230655718_15829.png)

## 6. 参考

- [GOROOT,GOPATH,GOBIN之间的区别 \- 简书](https://www.jianshu.com/p/fb7787acdf6e)
- [Go 程序是怎样跑起来的 \| qcrao](https://qcrao.com/2019/07/03/how-go-runs/#%E8%AF%8D%E6%B3%95%E5%88%86%E6%9E%90)
- [cuonglm/gocmt: Add missing comment on exported function, method, type, constant, variable in go file](https://github.com/cuonglm/gocmt)