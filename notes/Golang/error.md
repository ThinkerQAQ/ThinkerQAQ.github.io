
## 1. exception和error
Golang把错误分成exception和error

- exception是严程序内部的BUG或者不可预料的情况
- error则是可以预期的，通过一个返回值来判断


## 2. 使用

### 2.1. exception
- 内部BUG通过recovery捕获转换成error处理
- 不可预料的就通过panic终止程序了


### 2.2. error
- 通过`fmt.ErrorOf`或者`errs.New`构造err
```go
func TestError1(t *testing.T) {
	//要求传入的字符串首字母小写，结尾不带标点符号
	fmt.Println(errors.New("network cannot reachable"))
	fmt.Println(fmt.Errorf("value %s too long", "aaaaaaaaaaa"))
}
//输出
network cannot reachable
value aaaaaaaaaaa too long
```

- 如何处理error
    - 使用`github.com/pkg/errors`
    - 原则
        - 不要重复处理。比如下层捕获error后打印了，又往上层抛出
        - 不要仅检查错误。比如下层往上抛出error，上层捕获到之后不要原封不动的往外抛，而是应该加上信息
        - 不要根据error string确定是否某个error。虽然可以通过转换类型来判断是否具体的类型，但更推荐定义错误码

#### 2.2.1. 例子
- main.go

```go
package main

import (
	"database/sql"
	"fmt"
	"github.com/pkg/errors"
	"log"
	"test/errors/service"
)



func main() {
	err := service.FindUser(1)
	if errors.Cause(err) == sql.ErrNoRows {
		fmt.Printf("data not found, %v\n", err)
		return
	}
	if err != nil {
		log.Fatalf("%+v\n", err)
		return
	}

	log.Println("---------------------------")
}

//输出
//如果是0
data not found, service finduser failed: dao find user faile
d: sql: no rows in result set

//如果是1
val cannot be 1
test/errors/dao.SelectOne
        C:/Users/zsk/code/go/test/errors/dao/dao.go:12
test/errors/service.FindUser
        C:/Users/zsk/code/go/test/errors/service/service.go:9
main.main
        C:/Users/zsk/code/go/test/errors/errors.go:32
runtime.main
        C:/software/Go/src/runtime/proc.go:203
runtime.goexit
        C:/software/Go/src/runtime/asm_amd64.s:1357
service finduser failed


//如果是2
---------------------------
```

- service.go

```go
package service

import (
	"github.com/pkg/errors"
	"test/errors/dao"
)

func FindUser(val int) error {
	return errors.WithMessage(dao.SelectOne(val), "service finduser failed")
}
    

```

- dao.go

```go
package dao

import (
	"database/sql"
	"github.com/pkg/errors"
)

func SelectOne(val int) error {
	if val == 0 {//封装底层error
		return errors.Wrap(sql.ErrNoRows, "dao find user failed")
	} else if val == 1 {//自定义error
		return errors.Errorf("val cannot be %d", val)
	}
	return nil
}

```

## 3. 原理
### 3.1. 数据结构

```go
type error interface {
    Error() string
}
```

### 3.2. 方法

```go
// src/errors/errors.go

func New(text string) error {
    //创建了errorString对象
	return &errorString{text}
}

//只包含了错误信息
type errorString struct {
	s string
}

func (e *errorString) Error() string {
	return e.s
}


func Errorf(format string, a ...interface{}) error {
    //先格式化字符串
	p := newPrinter()
	p.wrapErrs = true
	p.doPrintf(format, a)
	s := string(p.buf)
	var err error
	if p.wrappedErr == nil {
	    //再通过errors.New创建
		err = errors.New(s)
	} else {
		err = &wrapError{s, p.wrappedErr}
	}
	p.free()
	return err
}
```

## 4. 最佳实践
```
go get -u golang.org/x/xerrors
```

- main

```go
func main() {
	err := service.FindUser(1)
	/* 
	2022/10/30 16:08:16 预定义错误: query user failed:
		test/errors/service.FindUser
			C:/Users/zsk/code/go/test/errors/service/service.go:11
	- check val [0] failed:
		test/errors/dao.checkVal
			C:/Users/zsk/code/go/test/errors/dao/dao.go:23
	- invalid val
	exit status 1
	*/
	if errors.Is(err, dao.ErrorInvalidVal) {
		log.Fatalf("预定义错误: %+v\n", err)
	}
	/* 
	2022/10/30 16:09:15 非预定义错误: query user failed:
		test/errors/service.FindUser
			C:/Users/zsk/code/go/test/errors/service/service.go:11
	- record not found for val [1]:
		test/errors/dao.SelectOne
			C:/Users/zsk/code/go/test/errors/dao/dao.go:16
	exit status 1
	*/
	if err != nil {
		log.Fatalf("非预定义错误: %+v\n", err)
	}
	log.Println("-------------success--------------")
}
```

- service

```go
func FindUser(val int) error {
	if err := dao.SelectOne(val); err != nil {
		return xerrors.Errorf("query user failed: %w", err)
	}
	return nil
}

```


- dao 

```go
var ErrorInvalidVal = errors.New("invalid val")

func SelectOne(val int) error {
	if err := checkVal(val); err != nil {
		return err
	}
	if val == 1 {
		return xerrors.Errorf("record not found for val [%v]", val)
	}
	return nil
}

func checkVal(val int) error {
	if val == 0 {
		return xerrors.Errorf("check val [%d] failed: %w", val, ErrorInvalidVal)
	}
	return nil
}

```
## 5. 参考
- [Go语言中的错误处理（Error Handling in Go） \| 技术哲学](https://ethancai.github.io/2017/12/29/Error-Handling-in-Go/)
- [Effective Go \- The Go Programming Language](https://golang.org/doc/effective_go.html#errors)
- [Golang error 的突围 \- 掘金](https://juejin.im/post/6844903944490057736)
- [Golang 错误处理最佳实践\. 官方团队和开发者社区都在尝试改进Go的错误处理，… \| by Che Dan \| Medium](https://medium.com/@dche423/golang-error-handling-best-practice-cn-42982bd72672)
- [Go语言\(golang\)的错误\(error\)处理的推荐方案 \| 飞雪无情的博客](https://www.flysnow.org/2019/01/01/golang-error-handle-suggestion.html)
- [go1\.13之Error Warp \- 木白的技术私厨](https://cbsheng.github.io/posts/go113%E4%B9%8Berrorwrap/)    