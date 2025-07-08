## 1. reverse tool

### 1.1. 安装

```
go get xorm.io/reverse
go get github.com/go-sql-driver/mysql
```

### 1.2. 使用

- 配置文件tao.yml

```yml
kind: reverse
name: mydb
source:
  database: mysql
  conn_str: 'root:zskroot@(127.0.0.1:3306)/tao?charset=utf8'
targets:
  - type: codes
    language: golang
    output_dir: ./
```

- 命令

```
cd models
reverse -f tao.yml
```

## 2. 参考
- [xorm/reverse: A flexsible and powerful command line tool to convert database to codes \- README\_CN\.md at master \- reverse \- Gitea: Git with a cup of tea](https://gitea.com/xorm/reverse/src/branch/master/README_CN.md)
- [Xorm](https://xorm.io/)